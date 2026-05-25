import Link from 'next/link'
import { Newsreader } from 'next/font/google'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
  weight: ['400', '500', '600'],
  adjustFontFallback: false,
})

// Uitnodiging accepteren. De middleware stuurt niet-ingelogde bezoekers eerst
// naar /login?next=… Daarna voegt accept_invite de gebruiker als lid toe.
export default async function InvitePage({ params }: { params: { token: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/uitnodiging/${params.token}`)
  }

  const { error } = await supabase.rpc('accept_invite', { p_token: params.token })
  if (!error) {
    redirect('/bruiloft')
  }

  return (
    <div className={`wedding ${newsreader.variable} flex min-h-screen items-center justify-center bg-background px-4 text-foreground`}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="font-serif text-2xl">Uitnodiging niet geldig</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Deze uitnodiging is verlopen, al gebruikt, of niet gevonden. Vraag de eigenaar van de
          bruiloft om een nieuwe link.
        </p>
        <Link
          href="/bruiloft"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Naar mijn trouwplan
        </Link>
      </div>
    </div>
  )
}
