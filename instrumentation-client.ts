import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://14ba353b4d70ae64555dc8804edc5989@o4511988581203968.ingest.us.sentry.io/4511988924743680",

  integrations: [Sentry.replayIntegration()],

  tracesSampleRate: 1,

  replaysSessionSampleRate: 0.1,

  replaysOnErrorSampleRate: 1.0,

  dataCollection: {
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
