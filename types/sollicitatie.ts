export type CvInput =
  | { kind: 'text'; text: string }
  | { kind: 'pdf'; data: string; mimeType: string; fileName: string }

export type LetterMessageKind = 'analysis' | 'question' | 'letter'

export interface LetterMessage {
  id: string
  role: 'user' | 'assistant'
  kind?: LetterMessageKind
  content: string
  timestamp: number
}
