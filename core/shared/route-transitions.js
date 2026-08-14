function toPathname(href) {
  const value = String(href || '').trim();

  if (!value) return '';

  try {
    return new URL(value, 'http://tvizzie.local').pathname || '/';
  } catch {
    return value.split(/[?#]/, 1)[0] || '';
  }
}

function getMediaRouteState(href) {
  const pathname = toPathname(href);
  const match = pathname.match(/^\/(movie|tv|person)\/([^/]+)(?:\/(.*))?$/);

  if (!match) return null;

  return {
    id: match[2],
    type: match[1],
    view: match[3] || 'overview',
  };
}

export function getRouteTransitionFamily(href) {
  const pathname = toPathname(href);

  if (pathname === '/') return 'home';
  if (/^\/(movie|tv|person)(?:\/|$)/.test(pathname)) return 'media';
  if (/^\/account(?:\/|$)/.test(pathname)) return 'account';
  if (/^\/(sign-in|sign-up|callback)(?:\/|$)/.test(pathname)) return 'auth';
  if (pathname === '/privacy' || pathname === '/terms') return 'legal';

  return null;
}

export function shouldSweepRouteTransition(from, to) {
  const fromPathname = toPathname(from);
  const toPathnameValue = toPathname(to);

  if (!fromPathname || !toPathnameValue || fromPathname === toPathnameValue) {
    return false;
  }

  const fromFamily = getRouteTransitionFamily(fromPathname);
  const toFamily = getRouteTransitionFamily(toPathnameValue);

  if (!fromFamily || !toFamily) {
    return false;
  }

  if (fromFamily !== toFamily) {
    return true;
  }

  if (fromFamily !== 'media') {
    return false;
  }

  const fromMedia = getMediaRouteState(fromPathname);
  const toMedia = getMediaRouteState(toPathnameValue);

  if (!fromMedia || !toMedia) {
    return false;
  }

  return fromMedia.type !== toMedia.type || fromMedia.id !== toMedia.id;
}
