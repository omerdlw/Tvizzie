import 'server-only';

export function makeAuthResponsePrivate(response, { varyByCookie = false } = {}) {
  response.headers.set('Cache-Control', 'private, no-store');

  if (varyByCookie) {
    const vary = response.headers.get('Vary');
    response.headers.set('Vary', vary ? `${vary}, Cookie` : 'Cookie');
  }

  return response;
}
