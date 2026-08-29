import { createElement, Fragment } from 'react';

export function composeProviders(...providers) {
  return providers.reduce(
    (AccumulatedProviders, [Provider, props = {}]) =>
      ({ children }) =>
        createElement(AccumulatedProviders, null, createElement(Provider, props, children)),
    ({ children }) => createElement(Fragment, null, children),
  );
}
