import { redirect } from 'next/navigation'

// Oude URL — doorverwijzen naar de nieuwe /inloggen (query-parameters behouden).
export default function LoginRedirect({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string') qs.set(key, value)
  }
  const query = qs.toString()
  redirect(query ? `/inloggen?${query}` : '/inloggen')
}
