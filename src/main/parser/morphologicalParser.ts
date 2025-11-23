/**
 * Morphological Parser
 * Simplified implementation inspired by xAMPLE's match-and-filter algorithm
 */

import type {
  Morpheme,
  MorphemeConstraint,
  ParseAnalysis,
  ParseMorph,
  ParseResult,
  ParserConfig
} from '@shared/types/parser'

export class MorphologicalParser {
  private morphemes: Map<string, Morpheme> = new Map()
  private constraints: Map<string, MorphemeConstraint> = new Map()
  private prefixTrie: TrieNode = new TrieNode()
  private suffixTrie: TrieNode = new TrieNode()
  private rootTrie: TrieNode = new TrieNode()
  private config: ParserConfig

  constructor(config: Partial<ParserConfig> = {}) {
    this.config = {
      maxAnalyses: config.maxAnalyses ?? 20,
      useAllomorphs: config.useAllomorphs ?? true,
      validateConstraints: config.validateConstraints ?? true,
      allowUnknownRoots: config.allowUnknownRoots ?? false
    }
  }

  /**
   * Load morphemes into the parser
   */
  loadMorphemes(morphemes: Morpheme[]): void {
    this.morphemes.clear()
    this.prefixTrie = new TrieNode()
    this.suffixTrie = new TrieNode()
    this.rootTrie = new TrieNode()

    for (const morpheme of morphemes) {
      this.morphemes.set(morpheme.id, morpheme)

      // Add to appropriate trie
      const forms = this.getAllForms(morpheme)
      for (const form of forms) {
        switch (morpheme.type) {
          case 'prefix':
            this.prefixTrie.insert(form, morpheme.id)
            break
          case 'suffix':
            // Reverse for suffix matching
            this.suffixTrie.insert(form.split('').reverse().join(''), morpheme.id)
            break
          case 'root':
            this.rootTrie.insert(form, morpheme.id)
            break
        }
      }
    }
  }

  /**
   * Load constraints
   */
  loadConstraints(constraints: MorphemeConstraint[]): void {
    this.constraints.clear()
    for (const constraint of constraints) {
      this.constraints.set(constraint.id, constraint)
    }
  }

  /**
   * Parse a word and return all possible analyses
   */
  parseWord(word: string): ParseResult {
    const startTime = Date.now()
    const analyses: ParseAnalysis[] = []

    // Recursive descent: try all combinations of prefixes + root + suffixes
    this.analyzeRecursive(word, [], 0, analyses)

    // Sort by validity and number of morphemes (prefer fewer morphemes)
    analyses.sort((a, b) => {
      if (a.isValid !== b.isValid) return a.isValid ? -1 : 1
      return a.morphs.length - b.morphs.length
    })

    // Limit to max analyses
    const limitedAnalyses = analyses.slice(0, this.config.maxAnalyses)

    return {
      word,
      analyses: limitedAnalyses,
      parseTime: Date.now() - startTime
    }
  }

  /**
   * Recursive descent parser
   * Tries all combinations: prefix* + root + suffix*
   */
  private analyzeRecursive(
    remaining: string,
    morphs: ParseMorph[],
    position: number,
    results: ParseAnalysis[]
  ): void {
    // Base case: if nothing left to parse
    if (remaining.length === 0) {
      // Must have at least one root
      const hasRoot = morphs.some(m => m.morpheme.type === 'root')
      if (hasRoot) {
        this.addAnalysis(morphs, results)
      }
      return
    }

    const currentStage = this.getCurrentStage(morphs)

    // Try prefixes (only if we haven't started suffixes)
    if (currentStage === 'prefix' || currentStage === 'start') {
      const prefixMatches = this.prefixTrie.findAll(remaining)
      for (const match of prefixMatches) {
        const morpheme = this.morphemes.get(match.morphemeId)!
        const newMorphs = [
          ...morphs,
          {
            morpheme,
            form: match.matched,
            position: { start: position, end: position + match.matched.length }
          }
        ]
        this.analyzeRecursive(
          remaining.slice(match.matched.length),
          newMorphs,
          position + match.matched.length,
          results
        )
      }
    }

    // Try roots (after prefixes, before suffixes)
    if (currentStage === 'prefix' || currentStage === 'start' || currentStage === 'root') {
      const rootMatches = this.rootTrie.findAll(remaining)
      for (const match of rootMatches) {
        const morpheme = this.morphemes.get(match.morphemeId)!
        const newMorphs = [
          ...morphs,
          {
            morpheme,
            form: match.matched,
            position: { start: position, end: position + match.matched.length }
          }
        ]
        this.analyzeRecursive(
          remaining.slice(match.matched.length),
          newMorphs,
          position + match.matched.length,
          results
        )
      }

      // Try unknown root (if allowed and no morphs yet or only prefixes)
      if (this.config.allowUnknownRoots && remaining.length > 0) {
        const hypotheticalRoot: Morpheme = {
          id: `unknown-${remaining}`,
          form: remaining,
          type: 'root',
          category: '?',
          gloss: '?'
        }
        const newMorphs = [
          ...morphs,
          {
            morpheme: hypotheticalRoot,
            form: remaining,
            position: { start: position, end: position + remaining.length }
          }
        ]
        this.addAnalysis(newMorphs, results)
      }
    }

    // Try suffixes (only after root)
    if (currentStage === 'suffix' || currentStage === 'root') {
      const reversed = remaining.split('').reverse().join('')
      const suffixMatches = this.suffixTrie.findAll(reversed)
      for (const match of suffixMatches) {
        const morpheme = this.morphemes.get(match.morphemeId)!
        const actualForm = match.matched.split('').reverse().join('')
        const newMorphs = [
          ...morphs,
          {
            morpheme,
            form: actualForm,
            position: { start: position, end: position + actualForm.length }
          }
        ]
        this.analyzeRecursive(
          remaining.slice(actualForm.length),
          newMorphs,
          position + actualForm.length,
          results
        )
      }
    }
  }

  /**
   * Determine current parsing stage based on morphs so far
   */
  private getCurrentStage(morphs: ParseMorph[]): 'start' | 'prefix' | 'root' | 'suffix' {
    if (morphs.length === 0) return 'start'

    const lastType = morphs[morphs.length - 1].morpheme.type
    if (lastType === 'suffix') return 'suffix'
    if (lastType === 'root') return 'root'
    if (lastType === 'prefix') return 'prefix'

    return 'start'
  }

  /**
   * Add an analysis to results after validation
   */
  private addAnalysis(morphs: ParseMorph[], results: ParseAnalysis[]): void {
    if (morphs.length === 0) return

    // Get final category from root
    const root = morphs.find(m => m.morpheme.type === 'root')
    const category = root?.morpheme.category ?? '?'

    // Build combined gloss
    const gloss = morphs.map(m => m.morpheme.gloss).join('-')

    // Validate constraints
    const validation = this.config.validateConstraints
      ? this.validateConstraints(morphs)
      : { isValid: true, violations: [] }

    const analysis: ParseAnalysis = {
      morphs,
      category,
      gloss,
      isValid: validation.isValid,
      violatedConstraints: validation.violations
    }

    results.push(analysis)
  }

  /**
   * Validate morpheme co-occurrence and ordering constraints
   */
  private validateConstraints(morphs: ParseMorph[]): {
    isValid: boolean
    violations: string[]
  } {
    const violations: string[] = []
    const morphemeIds = new Set(morphs.map(m => m.morpheme.id))

    for (const morph of morphs) {
      const morphemeId = morph.morpheme.id
      const constraint = this.constraints.get(morphemeId)
      if (!constraint) continue

      // Check requires
      if (constraint.requires) {
        for (const required of constraint.requires) {
          if (!morphemeIds.has(required)) {
            violations.push(`${morphemeId} requires ${required}`)
          }
        }
      }

      // Check excludes
      if (constraint.excludes) {
        for (const excluded of constraint.excludes) {
          if (morphemeIds.has(excluded)) {
            violations.push(`${morphemeId} excludes ${excluded}`)
          }
        }
      }

      // Check ordering
      if (constraint.mustPrecede || constraint.mustFollow) {
        const currentIndex = morphs.indexOf(morph)

        if (constraint.mustPrecede) {
          for (const shouldFollow of constraint.mustPrecede) {
            const followerIndex = morphs.findIndex(m => m.morpheme.id === shouldFollow)
            if (followerIndex !== -1 && followerIndex < currentIndex) {
              violations.push(`${morphemeId} must precede ${shouldFollow}`)
            }
          }
        }

        if (constraint.mustFollow) {
          for (const shouldPrecede of constraint.mustFollow) {
            const precedingIndex = morphs.findIndex(m => m.morpheme.id === shouldPrecede)
            if (precedingIndex !== -1 && precedingIndex > currentIndex) {
              violations.push(`${morphemeId} must follow ${shouldPrecede}`)
            }
          }
        }
      }
    }

    return {
      isValid: violations.length === 0,
      violations
    }
  }

  /**
   * Get all forms (including allomorphs) for a morpheme
   */
  private getAllForms(morpheme: Morpheme): string[] {
    const forms = [morpheme.form]

    if (this.config.useAllomorphs && morpheme.allomorphs) {
      for (const allomorph of morpheme.allomorphs) {
        forms.push(allomorph.form)
      }
    }

    return forms
  }
}

/**
 * Trie data structure for efficient prefix matching
 */
class TrieNode {
  children: Map<string, TrieNode> = new Map()
  morphemeIds: string[] = []

  insert(str: string, morphemeId: string): void {
    let node: TrieNode = this
    for (const char of str) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode())
      }
      node = node.children.get(char)!
    }
    node.morphemeIds.push(morphemeId)
  }

  /**
   * Find all matches starting from the beginning of str
   */
  findAll(str: string): Array<{ matched: string; morphemeId: string }> {
    const results: Array<{ matched: string; morphemeId: string }> = []
    let node: TrieNode = this
    let matched = ''

    for (const char of str) {
      if (!node.children.has(char)) break

      node = node.children.get(char)!
      matched += char

      // Add all morphemes at this node
      for (const morphemeId of node.morphemeIds) {
        results.push({ matched, morphemeId })
      }
    }

    return results
  }
}
