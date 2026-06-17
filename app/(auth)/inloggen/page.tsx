import type { Metadata } from 'next'

import { LoginForm } from '@/components/auth/LoginForm'

export const metadata: Metadata = { title: 'Inloggen' }

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string; succes?: string }
}) {
  return <LoginForm next={searchParams.next} error={searchParams.error} succes={searchParams.succes} />
}
