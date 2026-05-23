import type { Metadata } from 'next'

import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'

export const metadata: Metadata = { title: 'Nieuw wachtwoord' }

export default function ResetPasswordPage() {
  return <ResetPasswordForm />
}
