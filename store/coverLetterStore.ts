import { create } from 'zustand'
import type {
  Analysis,
  CvInput,
  IterationStage,
  LetterStyle,
  Verdict,
} from '@/types/cover-letter'

export type WizardStep = 1 | 2 | 3 | 4

interface CoverLetterState {
  step: WizardStep
  cv: CvInput | null
  vacancyUrl: string
  vacancyText: string
  extraInstructions: string
  motivation: string
  uniqueValue: string
  analysis: Analysis | null
  answers: string[]
  streamStage: IterationStage | null
  streamLabel: string
  letters: string[]
  markedSentences: number[][]
  letter: string | null
  verdict: Verdict | null
  activeStyle: LetterStyle | null
  error: string | null
}

interface CoverLetterActions {
  setStep: (step: WizardStep) => void
  setCv: (cv: CvInput | null) => void
  setVacancyUrl: (url: string) => void
  setVacancyText: (text: string) => void
  setExtraInstructions: (text: string) => void
  setMotivation: (text: string) => void
  setUniqueValue: (text: string) => void
  setAnalysis: (analysis: Analysis) => void
  setAnswer: (index: number, value: string) => void
  setStream: (stage: IterationStage | null, label?: string) => void
  setLetters: (letters: string[]) => void
  toggleSentence: (letterIndex: number, sentenceIndex: number) => void
  clearMarked: () => void
  setResult: (letter: string, verdict: Verdict) => void
  setLetter: (letter: string) => void
  setActiveStyle: (style: LetterStyle | null) => void
  setError: (error: string | null) => void
  reset: () => void
}

const initialState: CoverLetterState = {
  step: 1,
  cv: null,
  vacancyUrl: '',
  vacancyText: '',
  extraInstructions: '',
  motivation: '',
  uniqueValue: '',
  analysis: null,
  answers: [],
  streamStage: null,
  streamLabel: '',
  letters: [],
  markedSentences: [],
  letter: null,
  verdict: null,
  activeStyle: null,
  error: null,
}

export const useCoverLetterStore = create<CoverLetterState & CoverLetterActions>()(
  (set) => ({
    ...initialState,

    setStep: (step) => set({ step }),

    setCv: (cv) => set({ cv }),

    setVacancyUrl: (vacancyUrl) => set({ vacancyUrl }),

    setVacancyText: (vacancyText) => set({ vacancyText }),

    setExtraInstructions: (extraInstructions) => set({ extraInstructions }),

    setMotivation: (motivation) => set({ motivation }),

    setUniqueValue: (uniqueValue) => set({ uniqueValue }),

    setAnalysis: (analysis) =>
      set({ analysis, answers: analysis.starrQuestions.map(() => '') }),

    setAnswer: (index, value) =>
      set((state) => {
        const answers = [...state.answers]
        answers[index] = value
        return { answers }
      }),

    setStream: (streamStage, streamLabel = '') => set({ streamStage, streamLabel }),

    setLetters: (letters) =>
      set({ letters, markedSentences: letters.map(() => []) }),

    toggleSentence: (letterIndex, sentenceIndex) =>
      set((state) => {
        const next = state.markedSentences.map((arr, i) => {
          if (i !== letterIndex) return arr
          return arr.includes(sentenceIndex)
            ? arr.filter((s) => s !== sentenceIndex)
            : [...arr, sentenceIndex]
        })
        return { markedSentences: next }
      }),

    clearMarked: () =>
      set((state) => ({ markedSentences: state.letters.map(() => []) })),

    setResult: (letter, verdict) => set({ letter, verdict }),

    setLetter: (letter) => set({ letter }),

    setActiveStyle: (activeStyle) => set({ activeStyle }),

    setError: (error) => set({ error }),

    reset: () => set(initialState),
  })
)
