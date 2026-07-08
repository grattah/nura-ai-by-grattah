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
