import type { Metadata } from 'next'

import { SignupPageForm } from '@/components/auth/SignupPageForm'

export const metadata: Metadata = { title: 'Account aanmaken — Ons Trouwplan' }

export default function SignupPage({
  searchParams,
}: {
  searchParams: { next?: string; email?: string }
}) {
  return <SignupPageForm next={searchParams.next} prefillEmail={searchParams.email} />
}
