"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchSearch } from "./client";
import { SEARCH_DEBOUNCE_MS } from "./constants";
import {
  SEARCH_TYPES,
  type SearchFailure,
  type SearchResults,
  type SearchScope,
} from "./types";
import { isSearchable, normalizeQuery } from "./utils";

export function emptyResults(): SearchResults {
  return { lists: [], movies: [], people: [], reviews: [], users: [] };
}

type Settled =
  | { query: string; scope: SearchScope; ok: true; results: SearchResults }
  | { query: string; scope: SearchScope; ok: false; failure: SearchFailure };

interface SearchState {
  clear: () => void;
  input: string;
  isLoading: boolean;
  query: string;
  failure: SearchFailure | null;
  results: SearchResults | null;
  retry: () => void;
  setInput: (value: string) => void;
}

export function useSearch(scope: SearchScope): SearchState {
  const [input, setRawInput] = useState("");
  const [debounced, setDebounced] = useState("");
  const [settled, setSettled] = useState<Settled | null>(null);
  const [attempt, setAttempt] = useState(0);

  const normalized = normalizeQuery(input);
  const query = isSearchable(normalized) ? normalized : "";
  const ready = debounced === query ? query : "";

  useEffect(() => {
    if (!query) return;
    const timer = setTimeout(() => setDebounced(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!ready) return;

    const controller = new AbortController();
    const { signal } = controller;
    const kinds = scope === "all" ? SEARCH_TYPES : [scope];
    void Promise.all(
      kinds.map((kind) => fetchSearch(kind, ready, signal)),
    ).then((outcomes) => {
      if (signal.aborted) return;

      const results = emptyResults();
      outcomes.forEach((outcome, index) => {
        if (outcome.success)
          Object.assign(results, { [kinds[index]]: outcome.data.hits });
      });

      const failed = outcomes.find((outcome) => !outcome.success);
      setSettled(
        failed && !failed.success && outcomes.every((o) => !o.success)
          ? { query: ready, scope, ok: false, failure: failed.error }
          : { query: ready, scope, ok: true, results },
      );
    });
    return () => controller.abort();
  }, [ready, scope, attempt]);

  const setInput = useCallback((value: string) => {
    setRawInput(value);
    if (!isSearchable(normalizeQuery(value))) setSettled(null);
  }, []);
  const clear = useCallback(() => setInput(""), [setInput]);
  const retry = useCallback(() => {
    setSettled(null);
    setAttempt((value) => value + 1);
  }, []);

  const current =
    settled && settled.query === query && settled.scope === scope
      ? settled
      : null;
  const lastGood =
    settled?.ok && settled.scope === scope ? settled.results : null;

  return {
    clear,
    failure: current && !current.ok ? current.failure : null,
    input,
    isLoading: query !== "" && current === null,
    query,
    results: query ? (current?.ok ? current.results : lastGood) : null,
    retry,
    setInput,
  };
}
