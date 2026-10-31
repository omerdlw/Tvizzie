"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { fetchSearch } from "./client";
import { SEARCH_CACHE_LIMIT, SEARCH_DEBOUNCE_MS } from "./constants";
import {
  SEARCH_TYPES,
  type SearchFailure,
  type SearchResults,
  type SearchScope,
  type SearchType,
} from "./types";
import { isSearchable, normalizeQuery } from "./utils";

function emptyResults(): SearchResults {
  return { lists: [], movies: [], people: [], reviews: [], users: [] };
}

type Hits = SearchResults[SearchType];
type Answers = ReadonlyMap<string, Hits>;

let answers: Answers = new Map();
const answerListeners = new Set<() => void>();

const answerKey = (kind: SearchType, query: string) =>
  `${kind}:${query.toLowerCase()}`;

function remember(kind: SearchType, query: string, hits: Hits) {
  const next = new Map(answers);
  const key = answerKey(kind, query);
  next.delete(key);
  next.set(key, hits);
  for (const oldest of next.keys()) {
    if (next.size <= SEARCH_CACHE_LIMIT) break;
    next.delete(oldest);
  }
  answers = next;
  answerListeners.forEach((listener) => listener());
}

function subscribeAnswers(listener: () => void) {
  answerListeners.add(listener);
  return () => {
    answerListeners.delete(listener);
  };
}

const readAnswers = () => answers;

function kindsOf(scope: SearchScope): readonly SearchType[] {
  return scope === "all" ? SEARCH_TYPES : [scope];
}

function collect(
  store: Answers,
  holes: ReadonlySet<string>,
  scope: SearchScope,
  query: string,
): SearchResults | null {
  const results = emptyResults();
  for (const kind of kindsOf(scope)) {
    const key = answerKey(kind, query);
    const hits = store.get(key);
    if (!hits && !holes.has(key)) return null;
    Object.assign(results, { [kind]: hits ?? [] });
  }
  return results;
}

interface SearchState {
  clear: () => void;
  failure: SearchFailure | null;
  input: string;
  isLoading: boolean;
  query: string;
  results: SearchResults | null;
  retry: () => void;
  setInput: (value: string) => void;
}

export function useSearch(scope: SearchScope): SearchState {
  const store = useSyncExternalStore(
    subscribeAnswers,
    readAnswers,
    readAnswers,
  );
  const [input, setInput] = useState("");
  const [debounced, setDebounced] = useState("");
  const [holes, setHoles] = useState<ReadonlySet<string>>(() => new Set());
  const [failed, setFailed] = useState<{
    key: string;
    failure: SearchFailure;
  } | null>(null);
  const [shown, setShown] = useState<{
    query: string;
    scope: SearchScope;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);

  const normalized = normalizeQuery(input);
  const query = isSearchable(normalized) ? normalized : "";
  const fresh = query ? collect(store, holes, scope, query) : null;
  const known = fresh !== null;
  const failureKey = `${scope}:${query.toLowerCase()}`;
  const failure = failed?.key === failureKey ? failed.failure : null;
  const ready = query && !known && !failure && debounced === query ? query : "";

  if (known && (shown?.query !== query || shown.scope !== scope)) {
    setShown({ query, scope });
  }

  useEffect(() => {
    if (!query || known) return;
    const timer = setTimeout(() => setDebounced(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, known]);

  useEffect(() => {
    if (!ready) return;

    const controller = new AbortController();
    const { signal } = controller;
    const kinds = kindsOf(scope).filter(
      (kind) => !answers.has(answerKey(kind, ready)),
    );
    void Promise.all(
      kinds.map((kind) => fetchSearch(kind, ready, signal)),
    ).then((outcomes) => {
      if (signal.aborted) return;

      const missing: string[] = [];
      let firstFailure: SearchFailure | null = null;
      outcomes.forEach((outcome, index) => {
        if (outcome.success) remember(kinds[index], ready, outcome.data.hits);
        else {
          missing.push(answerKey(kinds[index], ready));
          firstFailure ??= outcome.error;
        }
      });

      const answered =
        outcomes.some((outcome) => outcome.success) ||
        kinds.length < kindsOf(scope).length;
      if (firstFailure && !answered) {
        setFailed({
          key: `${scope}:${ready.toLowerCase()}`,
          failure: firstFailure,
        });
      } else if (missing.length > 0) {
        setHoles((current) => new Set([...current, ...missing]));
      }
    });
    return () => controller.abort();
  }, [ready, scope, attempt]);

  const clear = useCallback(() => setInput(""), []);
  const retry = useCallback(() => {
    setFailed(null);
    setHoles(new Set());
    setAttempt((value) => value + 1);
  }, []);

  const stale =
    shown && shown.scope === scope
      ? collect(store, holes, scope, shown.query)
      : null;

  return {
    clear,
    failure,
    input,
    isLoading: query !== "" && !known && !failure,
    query,
    results: query ? (fresh ?? stale) : null,
    retry,
    setInput,
  };
}
