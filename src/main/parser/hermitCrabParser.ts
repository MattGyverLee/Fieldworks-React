/**
 * Hermit Crab Morphological Parser
 * TypeScript port of core Hermit Crab functionality
 */

import { Shape, ShapeNode, CharacterDefinitionTable } from './shape'
import { FeatureStruct, stringFeature } from './featureStructure'
import { PhonologicalRule } from './phonologicalRules'
import type { Morpheme } from '@shared/types'

// ============================================================================
// Word Representation
// ============================================================================

export interface Word {
  shape: Shape // Phonological form
  syntacticFeatures: FeatureStruct // Grammatical features (POS, agreement, etc.)
  realizationalFeatures: FeatureStruct // Features that must be realized
  rootAllomorph?: Allomorph
  affixAllomorphs: Allomorph[]
  gloss: string
}

// ============================================================================
// Allomorph
// ============================================================================

export interface Allomorph {
  shape: Shape
  morpheme: Morpheme
  environments?: AllomorphEnvironment[] // Phonological contexts where this allomorph appears
}

export interface AllomorphEnvironment {
  leftContext?: FeatureStruct[]
  rightContext?: FeatureStruct[]
}

// ============================================================================
// Hermit Crab Parser
// ============================================================================

export class HermitCrabParser {
  private morphemes: Map<string, Morpheme> = new Map()
  private charDefTable: CharacterDefinitionTable
  private phonologicalRules: PhonologicalRule[] = []

  constructor(charDefTable: CharacterDefinitionTable) {
    this.charDefTable = charDefTable
  }

  /**
   * Load morphemes into the parser
   */
  loadMorphemes(morphemes: Morpheme[]): void {
    this.morphemes.clear()
    for (const morpheme of morphemes) {
      this.morphemes.set(morpheme.id, morpheme)
    }
  }

  /**
   * Add a phonological rule
   */
  addPhonologicalRule(rule: PhonologicalRule): void {
    this.phonologicalRules.push(rule)
  }

  /**
   * Parse a word (analysis direction)
   */
  parseWord(surfaceForm: string): Word[] {
    const results: Word[] = []

    // 1. Convert string to Shape
    const surfaceShape = Shape.fromString(surfaceForm, this.charDefTable)

    // 2. Unapply phonological rules (reverse direction)
    const underlyingShapes = this.unapplyPhonology(surfaceShape)

    // 3. For each underlying form, try morphological analysis
    for (const underlyingShape of underlyingShapes) {
      const analyses = this.morphologicalAnalysis(underlyingShape)

      // 4. Resynthesize and validate
      for (const analysis of analyses) {
        const synthesized = this.synthesize(analysis)
        if (this.validate(synthesized, surfaceForm)) {
          results.push(synthesized)
        }
      }
    }

    // 5. If no analyses found, try root guessing
    if (results.length === 0) {
      const guess = this.guessRoot(surfaceForm)
      if (guess) {
        results.push(guess)
      }
    }

    return results
  }

  /**
   * Unapply phonological rules in reverse order
   */
  private unapplyPhonology(shape: Shape): Shape[] {
    let currentShapes = [shape]

    // Apply rules in reverse order
    for (let i = this.phonologicalRules.length - 1; i >= 0; i--) {
      const rule = this.phonologicalRules[i]
      const newShapes: Shape[] = []

      for (const currentShape of currentShapes) {
        const unapplied = rule.unapply(currentShape)
        newShapes.push(...unapplied)
      }

      currentShapes = newShapes

      // Limit combinatorial explosion
      if (currentShapes.length > 50) {
        currentShapes = currentShapes.slice(0, 50)
      }
    }

    return currentShapes
  }

  /**
   * Morphological analysis - break shape into morphemes
   */
  private morphologicalAnalysis(shape: Shape): Word[] {
    const analyses: Word[] = []

    // Try to find root allomorphs
    const rootMatches = this.findRootAllomorphs(shape)

    for (const rootMatch of rootMatches) {
      const word: Word = {
        shape: shape.clone(),
        syntacticFeatures: new FeatureStruct(),
        realizationalFeatures: new FeatureStruct(),
        rootAllomorph: rootMatch.allomorph,
        affixAllomorphs: [],
        gloss: rootMatch.allomorph.morpheme.gloss
      }

      // Try to find affixes
      const withAffixes = this.findAffixes(word, rootMatch.beforeRoot, rootMatch.afterRoot)
      analyses.push(...withAffixes)
    }

    return analyses
  }

  private findRootAllomorphs(shape: Shape): RootMatch[] {
    const matches: RootMatch[] = []

    for (const morpheme of this.morphemes.values()) {
      if (morpheme.type !== 'root') continue

      // Create allomorph shape
      const morphShape = Shape.fromString(morpheme.form, this.charDefTable)

      // Try to find this morpheme in the shape
      let current = shape.first
      while (current && !current.isMargin) {
        if (this.shapeMatches(morphShape, current)) {
          // Found a match
          const allomorph: Allomorph = {
            shape: morphShape,
            morpheme: morpheme
          }

          // Get nodes before and after the root
          const beforeRoot = this.getNodesBefore(shape, current)
          const afterRoot = this.getNodesAfter(shape, current, morphShape.length)

          matches.push({
            allomorph,
            startNode: current,
            beforeRoot,
            afterRoot
          })
        }
        current = current.next
      }
    }

    return matches
  }

  private shapeMatches(pattern: Shape, startNode: ShapeNode): boolean {
    let patternNode = pattern.first
    let currentNode: ShapeNode | null = startNode

    while (patternNode && !patternNode.isMargin && currentNode && !currentNode.isMargin) {
      if (!patternNode.featureStruct.subsumes(currentNode.featureStruct)) {
        return false
      }
      patternNode = patternNode.next
      currentNode = currentNode.next
    }

    return patternNode === null || patternNode.isMargin
  }

  private getNodesBefore(shape: Shape, node: ShapeNode): ShapeNode[] {
    const nodes: ShapeNode[] = []
    let current = shape.first
    while (current && current !== node && !current.isMargin) {
      nodes.push(current)
      current = current.next
    }
    return nodes
  }

  private getNodesAfter(_shape: Shape, node: ShapeNode, skip: number): ShapeNode[] {
    const nodes: ShapeNode[] = []
    let current: ShapeNode | null = node

    // Skip past the root
    for (let i = 0; i < skip && current && !current.isMargin; i++) {
      current = current.next
    }

    // Collect remaining nodes
    while (current && !current.isMargin) {
      nodes.push(current)
      current = current.next
    }

    return nodes
  }

  private findAffixes(baseWord: Word, prefixNodes: ShapeNode[], suffixNodes: ShapeNode[]): Word[] {
    const results: Word[] = [baseWord]

    // Try to match prefixes
    if (prefixNodes.length > 0) {
      const prefixMatches = this.matchAffixes(prefixNodes, 'prefix')
      for (const match of prefixMatches) {
        const word = { ...baseWord }
        word.affixAllomorphs = [...match.allomorphs, ...word.affixAllomorphs]
        word.gloss = match.allomorphs.map(a => a.morpheme.gloss).join('-') + '-' + word.gloss
        results.push(word)
      }
    }

    // Try to match suffixes
    if (suffixNodes.length > 0) {
      const suffixMatches = this.matchAffixes(suffixNodes, 'suffix')
      for (const match of suffixMatches) {
        const word = { ...baseWord }
        word.affixAllomorphs = [...word.affixAllomorphs, ...match.allomorphs]
        word.gloss = word.gloss + '-' + match.allomorphs.map(a => a.morpheme.gloss).join('-')
        results.push(word)
      }
    }

    return results
  }

  private matchAffixes(nodes: ShapeNode[], type: 'prefix' | 'suffix'): AffixMatch[] {
    const matches: AffixMatch[] = []

    for (const morpheme of this.morphemes.values()) {
      if (morpheme.type !== type) continue

      const morphShape = Shape.fromString(morpheme.form, this.charDefTable)

      if (morphShape.length <= nodes.length) {
        const allomorph: Allomorph = {
          shape: morphShape,
          morpheme
        }

        matches.push({
          allomorphs: [allomorph],
          length: morphShape.length
        })
      }
    }

    return matches
  }

  /**
   * Synthesize - apply phonological rules to create surface form
   */
  private synthesize(word: Word): Word {
    let shape = word.shape.clone()

    // Apply phonological rules in forward direction
    for (const rule of this.phonologicalRules) {
      shape = rule.apply(shape)
    }

    return {
      ...word,
      shape
    }
  }

  /**
   * Validate - check if synthesized form matches surface form
   */
  private validate(word: Word, surfaceForm: string): boolean {
    const synthesizedStr = this.charDefTable.shapeToString(word.shape)
    return synthesizedStr === surfaceForm
  }

  /**
   * Root guessing - create hypothetical root for unknown words
   */
  private guessRoot(surfaceForm: string): Word | null {
    const shape = Shape.fromString(surfaceForm, this.charDefTable)

    const hypotheticalMorpheme: Morpheme = {
      id: `guess-${surfaceForm}`,
      form: surfaceForm,
      type: 'root',
      category: '?',
      gloss: '?'
    }

    const allomorph: Allomorph = {
      shape,
      morpheme: hypotheticalMorpheme
    }

    return {
      shape,
      syntacticFeatures: new FeatureStruct(),
      realizationalFeatures: new FeatureStruct(),
      rootAllomorph: allomorph,
      affixAllomorphs: [],
      gloss: '?'
    }
  }
}

interface RootMatch {
  allomorph: Allomorph
  startNode: ShapeNode
  beforeRoot: ShapeNode[]
  afterRoot: ShapeNode[]
}

interface AffixMatch {
  allomorphs: Allomorph[]
  length: number
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a default character definition table for English
 */
export function createEnglishCharDefTable(): CharacterDefinitionTable {
  const table = new CharacterDefinitionTable()

  // Vowels
  const vowels = ['a', 'e', 'i', 'o', 'u']
  for (const v of vowels) {
    const features = new FeatureStruct()
    features.set('syllabic', stringFeature('+'))
    features.set('consonantal', stringFeature('-'))
    table.define(v, features)
  }

  // Consonants
  const consonants = ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'q', 'r', 's', 't', 'v', 'w', 'x', 'y', 'z']
  for (const c of consonants) {
    const features = new FeatureStruct()
    features.set('syllabic', stringFeature('-'))
    features.set('consonantal', stringFeature('+'))
    table.define(c, features)
  }

  return table
}
