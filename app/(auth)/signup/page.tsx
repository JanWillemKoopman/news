import type { Metadata } from 'next'

import { SignupForm } from '@/components/auth/SignupForm'

export const metadata: Metadata = { title: 'Account aanmaken' }

export default function SignupPage() {
  return <SignupForm />
}
