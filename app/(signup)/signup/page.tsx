import { redirect } from 'next/navigation'

// Oude URL — doorverwijzen naar de nieuwe /aanmelden (query-parameters behouden).
export default function SignupRedirect({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string') qs.set(key, value)
  }
  const query = qs.toString()
  redirect(query ? `/aanmelden?${query}` : '/aanmelden')
}
