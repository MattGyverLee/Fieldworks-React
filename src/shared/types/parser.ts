/**
 * Morphological Parser Types
 * Inspired by xAMPLE algorithm but simplified for TypeScript
 */

export type MorphemeType = 'prefix' | 'root' | 'suffix' | 'infix' | 'circumfix'

export interface Morpheme {
  id: string
  form: string // The morpheme form (e.g., "un-", "-ing", "walk")
  type: MorphemeType
  category: string // Part of speech (e.g., "V", "N", "Adj")
  gloss: string // English gloss
  properties?: string[] // Morphological properties
  allomorphs?: Allomorph[] // Alternative forms
}

export interface Allomorph {
  form: string
  environment?: PhonologicalEnvironment // Conditions for this allomorph
}

export interface PhonologicalEnvironment {
  preceding?: string // Regex pattern for preceding context
  following?: string // Regex pattern for following context
}

export interface MorphemeConstraint {
  id: string
  morphemeId: string
  // Co-occurrence constraints
  requires?: string[] // Morpheme IDs that must also appear
  excludes?: string[] // Morpheme IDs that cannot appear
  // Ordering constraints
  mustPrecede?: string[] // Morpheme IDs that must come after this one
  mustFollow?: string[] // Morpheme IDs that must come before this one
}

export interface ParseMorph {
  morpheme: Morpheme
  form: string // The actual form matched in the word
  position: {
    start: number
    end: number
  }
}

export interface ParseAnalysis {
  morphs: ParseMorph[]
  category: string // Final category (usually from root)
  gloss: string // Combined gloss
  isValid: boolean // Passed all constraints
  violatedConstraints?: string[] // Constraint IDs that were violated
}

export interface ParseResult {
  word: string
  analyses: ParseAnalysis[]
  parseTime: number // milliseconds
}

export interface ParserConfig {
  maxAnalyses: number // Maximum analyses to return (default: 20)
  useAllomorphs: boolean // Consider allomorphs (default: true)
  validateConstraints: boolean // Apply constraint validation (default: true)
  allowUnknownRoots: boolean // Generate hypothetical roots (default: false)
}
