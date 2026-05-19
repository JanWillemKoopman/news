import { GoogleGenAI } from '@google/genai'

/**
 * Model used for every Gemini call. Overridable via GEMINI_MODEL so a wrong
 * preview identifier can be corrected without a code change.
 */
export const MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-pro-preview'

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
