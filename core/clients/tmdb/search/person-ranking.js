import {
  createSearchQueryProfile,
  dedupeSearchItems,
  getBestSearchTextMatch,
  normalizeSearchScope,
  sortSearchItemsByAuthority,
  withMediaType,
} from './shared';

function getPersonSearchTexts(person = {}) {
  return [person?.name, person?.original_name].filter(Boolean);
}

function getPersonAuthorityValue(person = {}) {
  const popularity = Number(person?.popularity) || 0;
  const knownForCount = Array.isArray(person?.known_for) ? person.known_for.length : 0;
  const profileBonus = person?.profile_path ? 18 : 0;

  return popularity * 8 + knownForCount * 12 + profileBonus;
}

function getPersonPopularityValue(person = {}) {
  return Number(person?.popularity) || 0;
}

function getPersonKnownForCount(person = {}) {
  return Array.isArray(person?.known_for) ? person.known_for.length : 0;
}

function getPersonMetadataSignalValue(person = {}) {
  const popularity = getPersonPopularityValue(person);
  const knownForCount = getPersonKnownForCount(person);
  const hasProfile = Boolean(person?.profile_path);
  const hasDepartment = Boolean(String(person?.known_for_department || '').trim());
  const biographyLength = String(person?.biography || '').trim().length;
  let signal = 0;

  signal += Math.round(popularity * 24);
  signal += knownForCount * 28;

  if (hasProfile) {
    signal += 120;
  }

  if (hasDepartment) {
    signal += 46;
  }

  if (biographyLength >= 180) {
    signal += 40;
  } else if (biographyLength >= 80) {
    signal += 20;
  }

  return signal;
}

function passesPersonSearchQualityGate(person = {}, scope = 'preview', match = null) {
  const popularity = getPersonPopularityValue(person);
  const knownForCount = getPersonKnownForCount(person);
  const hasProfile = Boolean(person?.profile_path);
  const hasDepartment = Boolean(String(person?.known_for_department || '').trim());
  const normalizedScope = normalizeSearchScope(scope);
  const isStrongMatch = Boolean(match?.isStrongMatch || match?.isVeryStrongMatch);
  const isVeryStrongMatch = Boolean(match?.isVeryStrongMatch);
  const coverage = Number(match?.coverage) || 0;

  if (normalizedScope === 'preview') {
    if (isVeryStrongMatch && hasProfile) {
      return true;
    }

    if (isStrongMatch && hasProfile && (popularity >= 0.25 || knownForCount > 0 || hasDepartment)) {
      return true;
    }

    return hasProfile && (popularity >= 0.55 || knownForCount > 0 || hasDepartment || coverage >= 0.78);
  }

  if (hasProfile) {
    return popularity >= 0.5 || knownForCount > 0 || hasDepartment || isStrongMatch;
  }

  if (isVeryStrongMatch && (knownForCount > 0 || hasDepartment)) {
    return true;
  }

  return popularity >= 5 && (knownForCount > 0 || hasDepartment || coverage >= 0.75);
}

function isPersonPreviewQualityMatch(person = {}, match = {}, queryProfile = createSearchQueryProfile('')) {
  const popularity = getPersonPopularityValue(person);
  const knownForCount = getPersonKnownForCount(person);
  const hasProfile = Boolean(person?.profile_path);
  const queryLength = queryProfile.queryLength;
  const coverage = Number(match.coverage) || 0;
  const orderedCoverage = Number(match.orderedCoverage) || 0;
  const isStrongMatch = Boolean(match.isStrongMatch);
  const isVeryStrongMatch = Boolean(match.isVeryStrongMatch);

  if (!hasProfile) {
    return false;
  }

  if (queryLength <= 3) {
    if (isVeryStrongMatch && coverage >= 0.75) {
      return true;
    }

    if (popularity >= 2 && coverage >= 0.55) {
      return true;
    }

    return isStrongMatch && popularity >= 1 && knownForCount > 0;
  }

  if (queryLength <= 5) {
    if (isVeryStrongMatch) {
      return true;
    }

    if (isStrongMatch && coverage >= 0.65) {
      return true;
    }

    return popularity >= 1.2 && knownForCount > 0 && orderedCoverage >= 0.55;
  }

  if (isStrongMatch && coverage >= 0.62) {
    return true;
  }

  if (popularity >= 1.1 && coverage >= 0.5) {
    return true;
  }

  return isVeryStrongMatch || (popularity >= 0.5 && coverage >= 0.68);
}

function resolvePersonSearchTotalScore(person = {}, match = {}) {
  const authorityScore = getPersonAuthorityValue(person);
  const metadataSignal = getPersonMetadataSignalValue(person);
  const relevanceScore = Math.round(match.score * 3.2);
  const lexicalSignalScore = Math.round((match.coverage || 0) * 220 + (match.orderedCoverage || 0) * 140);

  return {
    authorityScore,
    metadataSignal,
    relevanceScore,
    totalScore: relevanceScore + authorityScore + metadataSignal + lexicalSignalScore,
  };
}

function buildPersonSearchEntry(person = {}, queryProfile = createSearchQueryProfile(''), options = {}) {
  if (!person?.id) {
    return null;
  }

  const match = getBestSearchTextMatch(getPersonSearchTexts(person), queryProfile);

  if (match.score <= 0) {
    return null;
  }

  if (!passesPersonSearchQualityGate(person, options.scope, match)) {
    return null;
  }

  if (normalizeSearchScope(options.scope) === 'preview' && !isPersonPreviewQualityMatch(person, match, queryProfile)) {
    return null;
  }

  return {
    ...resolvePersonSearchTotalScore(person, match),
    item: person,
    match,
  };
}

export function rankResolvedPersonSearchItems(items = [], query = '', options = {}) {
  const queryProfile = createSearchQueryProfile(query);
  const normalizedItems = dedupeSearchItems(withMediaType(items, 'person'));
  const qualityItems = normalizedItems.filter((person) => passesPersonSearchQualityGate(person, options.scope));
  const candidates = normalizedItems
    .map((person) => buildPersonSearchEntry(person, queryProfile, options))
    .filter(Boolean);

  if (!candidates.length) {
    if (normalizeSearchScope(options.scope) === 'preview') {
      return [];
    }

    return sortSearchItemsByAuthority(qualityItems, getPersonAuthorityValue);
  }

  return candidates
    .sort((left, right) => {
      if (right.totalScore !== left.totalScore) {
        return right.totalScore - left.totalScore;
      }

      if (right.match.score !== left.match.score) {
        return right.match.score - left.match.score;
      }

      return right.authorityScore - left.authorityScore;
    })
    .map(({ item }) => item);
}

export function buildPersonAuthorityFallbackItems(items = [], options = {}) {
  const normalizedItems = dedupeSearchItems(withMediaType(items, 'person'));

  if (normalizeSearchScope(options.scope) === 'preview') {
    return [];
  }

  return sortSearchItemsByAuthority(
    normalizedItems.filter((person) => passesPersonSearchQualityGate(person, options.scope)),
    getPersonAuthorityValue
  );
}
