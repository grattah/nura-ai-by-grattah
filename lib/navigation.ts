interface BackCapableRouter {
  back: () => void;
  push: (href: string) => void;
}

/** Goes back, or home when there is no in-app history. */
export function backOrHome(router: BackCapableRouter) {
  if (typeof window === "undefined") {
    router.push("/");
    return;
  }

  if (window.history.length <= 1) {
    router.push("/");
    return;
  }

  let navigated = false;
  const onPopState = () => {
    navigated = true;
  };
  window.addEventListener("popstate", onPopState);
  router.back();
  window.setTimeout(() => {
    window.removeEventListener("popstate", onPopState);
    if (!navigated) router.push("/");
  }, 200);
}

const NO_RETURN_PREFIXES = ["/landing", "/auth"];

function isWorthReturningTo(pathname: string): boolean {
  return (
    !!pathname &&
    pathname !== "/" &&
    !NO_RETURN_PREFIXES.some((p) => pathname.startsWith(p))
  );
}

export function withNextParam(basePath: string, next?: string | null): string {
  return next ? `${basePath}?next=${encodeURIComponent(next)}` : basePath;
}

export function loginHrefWithNext(pathname: string): string {
  return withNextParam("/auth/login", isWorthReturningTo(pathname) ? pathname : null);
}

export function landingHrefWithNext(pathname: string): string {
  return withNextParam("/landing", isWorthReturningTo(pathname) ? pathname : null);
}
