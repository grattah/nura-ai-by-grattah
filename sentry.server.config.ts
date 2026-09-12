import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://14ba353b4d70ae64555dc8804edc5989@o4511988581203968.ingest.us.sentry.io/4511988924743680",

  tracesSampleRate: 1,

  dataCollection: {
  },
});
