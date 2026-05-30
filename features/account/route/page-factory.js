export function createAccountRoutePage(Client, loadRouteData, options = null) {
  return async function Page(props = {}) {
    const [params, searchParams] = await Promise.all([props.params, props.searchParams]);
    const resolvedParams = params || null;
    const resolvedSearchParams = searchParams || null;

    if (typeof options?.beforeLoad === 'function') {
      await options.beforeLoad(resolvedParams, resolvedSearchParams);
    }

    const routeData = await loadRouteData(
      resolvedParams?.username,
      typeof options === 'function'
        ? await options(resolvedSearchParams, resolvedParams)
        : options?.resolveOptions
          ? await options.resolveOptions(resolvedSearchParams, resolvedParams)
          : undefined
    );

    return <Client routeData={routeData} />;
  };
}
