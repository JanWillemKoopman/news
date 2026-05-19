export type CvInput =
  | { kind: 'text'; text: string }
  | { kind: 'pdf'; data: string; mimeType: string; fileName: string }

export interface Analysis {
  gapAnalysis: string
  companyDna: string[]
  missingSkills: string[]
  starrQuestions: string[]
  cvText: string
}

export interface QuestionAnswer {
  question: string
  answer: string
}

export interface ExampleLetter {
  id: string
  title: string
  content: string
  createdAt: number
}

export type LetterStyle = 'challenger' | 'expert' | 'culture'

export interface Verdict {
  strengths: string[]
  bridgedGaps: string[]
  strategicChoices: string[]
  atsKeywords: string[]
}

export type IterationStage =
  | 'writing'
  | 'reviewing'
  | 'refining'
  | 'humanizing'
  | 'verdict'
  | 'done'
  | 'error'
