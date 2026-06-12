import type { Metadata } from 'next'

import { OnboardingWizard } from '@/components/bruiloft/OnboardingWizard'

export const metadata: Metadata = { title: 'Trouwplan opstellen — Ons Trouwplan' }

export default function TrouwplanPage() {
  return <OnboardingWizard authenticatedMode />
}
