export const ANALYTICS_EVENTS = {
  SIGNUP_STARTED: "signup_started",
  SIGNUP_COMPLETED: "signup_completed",
  LOGIN_STARTED: "login_started",
  LOGIN_COMPLETED: "login_completed",
  APP_ENTERED: "app_entered",
  WORKFLOW_STARTED: "workflow_started",
  WORKFLOW_COMPLETED: "workflow_completed",
  RESTRICTION_ENCOUNTERED: "restriction_encountered",
} as const;

/** `surface` property on workflow_started / workflow_completed */
export const WORKFLOW_SURFACES = {
  FIND_RECIPE_GENERATE: "find_recipe_generate",
  FIND_RECIPE_SUGGESTIONS: "find_recipe_suggestions",
  PERSONALIZED_SEARCH: "personalized_search",
} as const;

/** `status` property on workflow_completed */
export const WORKFLOW_STATUS = {
  OK: "ok",
  BLOCKED: "blocked",
  OUT_OF_TOKENS: "out_of_tokens",
  ERROR: "error",
} as const;

/** `restriction_type` property on restriction_encountered */
export const RESTRICTION_TYPES = {
  AUTH_REQUIRED: "auth_required",
  SUBSCRIPTION_REQUIRED: "subscription_required",
  FREE_TRIAL_EXHAUSTED: "free_trial_exhausted",
  NO_TOKENS: "no_tokens",
  INSUFFICIENT_TOKENS: "insufficient_tokens",
  RECIPE_CONTENT_PAYWALL: "recipe_content_paywall",
  DESKTOP_NOT_SUPPORTED: "desktop_not_supported",
} as const;
