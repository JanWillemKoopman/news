'use client'

import { useChatStore } from '@/store/chatStore'
import SelectionScreen from '@/components/SelectionScreen'
import ChatScreen from '@/components/ChatScreen'

export default function Home() {
  const screen = useChatStore((s) => s.screen)
  return screen === 'selection' ? <SelectionScreen /> : <ChatScreen />
}
