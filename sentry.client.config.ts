import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 10% van de traces opnemen voor performance monitoring
  tracesSampleRate: 0.1,

  // Geen debug-output in productie
  debug: false,
})
