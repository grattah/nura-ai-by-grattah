// Trusted health/nutrition domains the app prefers when grounding AI output.
// Mirrors the default `allowedDomains` used by the RAG follow-up chat
// (components/follow-up-section.tsx) so recipe generation grounds in the same
// sources. Passed from the page into the request body, like FollowUpSection does.
export const WELLNESS_SOURCES = [
  "healthline.com",
  "webmd.com",
  "nhs.uk",
  "mayoclinic.org",
];
