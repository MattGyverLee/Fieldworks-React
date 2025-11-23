/**
 * Phonological Rules for Hermit Crab
 * Simplified implementation of context-sensitive rewrite rules
 */

import { Shape, ShapeNode, CharacterDefinitionTable } from './shape'
import { FeatureStruct, symbolicFeature } from './featureStructure'

// ============================================================================
// Pattern Matching
// ============================================================================

export interface Pattern {
  /**
   * Match this pattern against a sequence of nodes
   * Returns all nodes that matched, or null if no match
   */
  match(shape: Shape, startNode: ShapeNode, direction: 'ltr' | 'rtl'): ShapeNode[] | null
}

/**
 * Segment pattern - matches a single node with specific features
 */
export class SegmentPattern implements Pattern {
  constructor(public features: FeatureStruct) {}

  match(_shape: Shape, startNode: ShapeNode, _direction: 'ltr' | 'rtl'): ShapeNode[] | null {
    if (startNode.isMargin) {
      return null
    }

    if (this.features.subsumes(startNode.featureStruct)) {
      return [startNode]
    }

    return null
  }
}

/**
 * Sequence pattern - matches a sequence of patterns
 */
export class SequencePattern implements Pattern {
  constructor(public patterns: Pattern[]) {}

  match(shape: Shape, startNode: ShapeNode, direction: 'ltr' | 'rtl'): ShapeNode[] | null {
    const matched: ShapeNode[] = []
    let current: ShapeNode | null = startNode

    for (const pattern of this.patterns) {
      if (!current || current.isMargin) {
        return null
      }

      const result = pattern.match(shape, current, direction)
      if (!result) {
        return null
      }

      matched.push(...result)
      current = direction === 'ltr' ? current.next : current.prev
    }

    return matched
  }
}

/**
 * Optional pattern - matches zero or one occurrence
 */
export class OptionalPattern implements Pattern {
  constructor(public pattern: Pattern) {}

  match(shape: Shape, startNode: ShapeNode, direction: 'ltr' | 'rtl'): ShapeNode[] | null {
    const result = this.pattern.match(shape, startNode, direction)
    return result || [] // Return empty array if no match (optional succeeded with zero)
  }
}

/**
 * Boundary pattern - matches word boundaries
 */
export class BoundaryPattern implements Pattern {
  match(_shape: Shape, startNode: ShapeNode, _direction: 'ltr' | 'rtl'): ShapeNode[] | null {
    return startNode.isMargin ? [] : null
  }
}

// ============================================================================
// Phonological Rule
// ============================================================================

export interface PhonologicalRuleContext {
  leftContext?: Pattern
  rightContext?: Pattern
}

export class PhonologicalRule {
  constructor(
    public id: string,
    public lhs: Pattern, // Pattern to match
    public rhs: FeatureStruct[], // Replacement features (one FeatureStruct per matched segment)
    public context?: PhonologicalRuleContext,
    public direction: 'ltr' | 'rtl' = 'ltr'
  ) {}

  /**
   * Apply this rule to a shape (synthesis direction)
   * Returns a new shape with the rule applied
   */
  apply(inputShape: Shape): Shape {
    const shape = inputShape.clone()
    const matches = this.findMatches(shape)

    // Apply rule at each match position
    for (const match of matches) {
      this.applyAtMatch(shape, match)
    }

    return shape
  }

  /**
   * Unapply this rule (analysis direction - reverse the rule)
   * This is the key to bidirectional processing
   */
  unapply(inputShape: Shape): Shape[] {
    const shape = inputShape.clone()
    const results: Shape[] = []

    // Find all positions where RHS could have been applied
    const rhsMatches = this.findRhsMatches(shape)

    if (rhsMatches.length === 0) {
      // No RHS matches - return original
      return [shape]
    }

    // For each possible RHS match, try reversing it
    for (const match of rhsMatches) {
      const reversed = this.reverseAtMatch(shape, match)
      if (reversed) {
        results.push(reversed)
      }
    }

    // Also include original (rule might not have applied)
    results.push(shape)

    return results
  }

  private findMatches(shape: Shape): MatchResult[] {
    const matches: MatchResult[] = []
    let current = this.direction === 'ltr' ? shape.first : shape.last

    while (current && !current.isMargin) {
      const match = this.tryMatch(shape, current)
      if (match) {
        matches.push(match)
      }
      current = this.direction === 'ltr' ? current.next : current.prev
    }

    return matches
  }

  private tryMatch(shape: Shape, node: ShapeNode): MatchResult | null {
    // Check left context
    if (this.context?.leftContext) {
      const leftNode = node.prev
      if (!leftNode || !this.context.leftContext.match(shape, leftNode, 'rtl')) {
        return null
      }
    }

    // Check LHS
    const lhsMatch = this.lhs.match(shape, node, this.direction)
    if (!lhsMatch) {
      return null
    }

    // Check right context
    if (this.context?.rightContext) {
      const rightNode = lhsMatch[lhsMatch.length - 1]?.next
      if (!rightNode || !this.context.rightContext.match(shape, rightNode, 'ltr')) {
        return null
      }
    }

    return { nodes: lhsMatch }
  }

  private applyAtMatch(shape: Shape, match: MatchResult): void {
    const { nodes } = match

    // Apply RHS features to matched nodes
    for (let i = 0; i < Math.min(nodes.length, this.rhs.length); i++) {
      const node = nodes[i]
      const rhsFeatures = this.rhs[i]

      // Unify RHS features with existing features
      const unified = node.featureStruct.unify(rhsFeatures)
      if (unified) {
        node.featureStruct = unified
      }
    }

    // Handle insertion (RHS longer than LHS)
    if (this.rhs.length > nodes.length) {
      const lastNode = nodes[nodes.length - 1]
      for (let i = nodes.length; i < this.rhs.length; i++) {
        const newNode = new ShapeNode(this.rhs[i].clone(), 0)
        shape.insertAfter(lastNode, newNode)
      }
    }

    // Handle deletion (LHS longer than RHS)
    if (nodes.length > this.rhs.length) {
      for (let i = this.rhs.length; i < nodes.length; i++) {
        shape.remove(nodes[i])
      }
    }
  }

  private findRhsMatches(shape: Shape): MatchResult[] {
    const matches: MatchResult[] = []
    let current = this.direction === 'ltr' ? shape.first : shape.last

    while (current && !current.isMargin) {
      // Try to match RHS pattern
      const rhsNodes: ShapeNode[] = []
      let node: ShapeNode | null = current

      for (const rhsFeatures of this.rhs) {
        if (!node || node.isMargin) break

        if (rhsFeatures.subsumes(node.featureStruct)) {
          rhsNodes.push(node)
          node = this.direction === 'ltr' ? node.next : node.prev
        } else {
          break
        }
      }

      if (rhsNodes.length === this.rhs.length) {
        // Check context
        let contextOk = true

        if (this.context?.leftContext) {
          const leftNode = rhsNodes[0].prev
          if (!leftNode || !this.context.leftContext.match(shape, leftNode, 'rtl')) {
            contextOk = false
          }
        }

        if (this.context?.rightContext) {
          const rightNode = rhsNodes[rhsNodes.length - 1].next
          if (!rightNode || !this.context.rightContext.match(shape, rightNode, 'ltr')) {
            contextOk = false
          }
        }

        if (contextOk) {
          matches.push({ nodes: rhsNodes })
        }
      }

      current = this.direction === 'ltr' ? current.next : current.prev
    }

    return matches
  }

  private reverseAtMatch(shape: Shape, match: MatchResult): Shape | null {
    const reversed = shape.clone()
    const { nodes } = match

    // This is a simplified reversal - just remove RHS features
    // In full Hermit Crab, this would reconstruct the LHS
    for (const node of nodes) {
      // Create a new node with minimal features
      // (This is oversimplified - real implementation would need to know original LHS)
      const newNode = new ShapeNode(new FeatureStruct(), 0)
      reversed.replace(node, newNode)
    }

    return reversed
  }
}

interface MatchResult {
  nodes: ShapeNode[]
}

// ============================================================================
// Rule Utilities
// ============================================================================

/**
 * Create a voicing rule: voiceless → voiced between vowels
 * Example: p → b / V_V
 */
export function createVoicingRule(_charDefTable: CharacterDefinitionTable): PhonologicalRule {
  const lhs = new SegmentPattern(new FeatureStruct())
  lhs.features.set('voice', symbolicFeature('-'))

  const rhs = new FeatureStruct()
  rhs.set('voice', symbolicFeature('+'))

  const vowelPattern = new SegmentPattern(new FeatureStruct())
  vowelPattern.features.set('syllabic', symbolicFeature('+'))

  return new PhonologicalRule(
    'voicing',
    lhs,
    [rhs],
    {
      leftContext: vowelPattern,
      rightContext: vowelPattern
    },
    'ltr'
  )
}

/**
 * Create a deletion rule: delete schwa word-finally
 * Example: ə → ∅ / _#
 */
export function createSchwaDeleton(): PhonologicalRule {
  const schwaFeatures = new FeatureStruct()
  schwaFeatures.set('height', symbolicFeature('mid'))
  schwaFeatures.set('backness', symbolicFeature('central'))

  const lhs = new SegmentPattern(schwaFeatures)
  const rhs: FeatureStruct[] = [] // Empty = deletion

  return new PhonologicalRule(
    'schwa-deletion',
    lhs,
    rhs,
    {
      rightContext: new BoundaryPattern()
    },
    'rtl'
  )
}
