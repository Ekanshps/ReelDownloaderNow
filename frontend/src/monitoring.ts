import * as Sentry from '@sentry/react'

const sentryDsn = import.meta.env.VITE_SENTRY_DSN
const plausibleDomain = import.meta.env.VITE_PLAUSIBLE_DOMAIN

if (sentryDsn) {
  Sentry.init({ dsn: sentryDsn, environment: import.meta.env.MODE, tracesSampleRate: 0.1 })
}

if (plausibleDomain && !document.querySelector('script[data-plausible]')) {
  const script = document.createElement('script')
  script.defer = true
  script.dataset.plausible = 'true'
  script.dataset.domain = plausibleDomain
  script.src = 'https://plausible.io/js/script.js'
  document.head.appendChild(script)
}

export function captureError(error: unknown) {
  if (sentryDsn) Sentry.captureException(error)
}
