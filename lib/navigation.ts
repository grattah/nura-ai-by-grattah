// Shared navigation helpers.

interface BackCapableRouter {
  back: () => void;
  push: (href: string) => void;
}

/**
 * Return the user to the page they came from, falling back to the homepage when
 * there's no in-app history (e.g. a direct deep link / fresh tab). Used when
 * cancelling the sign-in or Get Nuko+ gates.
 */
export function backOrHome(router: BackCapableRouter) {
  if (typeof window !== "undefined" && window.history.length > 1) {
    router.back();
  } else {
    router.push("/");
  }
}

// Paths that aren't worth returning to after login — sending the user home
// is just as good, so skip attaching `next` for these.
const NO_RETURN_PREFIXES = ["/landing", "/auth"];

/**
 * Build a /auth/login href that remembers the current page, so the login form
 * can send the user back to it afterwards (see resolveNextDestination in
 * auth-form.tsx). Omits `next` for the home/landing/auth pages themselves.
 */
export function loginHrefWithNext(pathname: string): string {
  if (
    !pathname ||
    pathname === "/" ||
    NO_RETURN_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    return "/auth/login";
  }
  return `/auth/login?next=${encodeURIComponent(pathname)}`;
}
