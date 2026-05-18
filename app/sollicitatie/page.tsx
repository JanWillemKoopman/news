'use client'

import { useLetterStore } from '@/store/letterStore'
import IntakeScreen from '@/components/sollicitatie/IntakeScreen'
import LetterChatScreen from '@/components/sollicitatie/LetterChatScreen'

export default function SollicitatiePage() {
  const screen = useLetterStore((s) => s.screen)
  return screen === 'intake' ? <IntakeScreen /> : <LetterChatScreen />
}
