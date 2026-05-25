import type { Metadata } from 'next'

import { SignupForm } from '@/components/auth/SignupForm'

export const metadata: Metadata = { title: 'Account aanmaken' }

export default function SignupPage({
  searchParams,
}: {
  searchParams: { next?: string }
}) {
  return <SignupForm next={searchParams.next} />
}
