/**
 * Shape - Phonological representation
 * Port of Hermit Crab's Shape (linked list of phonological segments)
 */

import { FeatureStruct } from './featureStructure'

// ============================================================================
// Shape Node
// ============================================================================

export class ShapeNode {
  public featureStruct: FeatureStruct
  public tag: number // Unique identifier
  public prev: ShapeNode | null = null
  public next: ShapeNode | null = null
  public isMargin: boolean = false // Begin/End boundary markers

  constructor(featureStruct: FeatureStruct, tag: number, isMargin: boolean = false) {
    this.featureStruct = featureStruct
    this.tag = tag
    this.isMargin = isMargin
  }

  /**
   * Clone this node (shallow - doesn't clone links)
   */
  clone(): ShapeNode {
    return new ShapeNode(this.featureStruct.clone(), this.tag, this.isMargin)
  }

  /**
   * Check if this node matches a pattern
   */
  matches(pattern: FeatureStruct): boolean {
    return pattern.subsumes(this.featureStruct)
  }

  toString(): string {
    if (this.isMargin) {
      return this.prev === null ? '#' : '#'
    }
    return this.featureStruct.toString()
  }
}

// ============================================================================
// Shape
// ============================================================================

export class Shape {
  private head: ShapeNode // Begin boundary
  private tail: ShapeNode // End boundary
  private nextTag: number = 0

  constructor() {
    // Create boundary markers
    this.head = new ShapeNode(new FeatureStruct(), this.getNextTag(), true)
    this.tail = new ShapeNode(new FeatureStruct(), this.getNextTag(), true)
    this.head.next = this.tail
    this.tail.prev = this.head
  }

  private getNextTag(): number {
    return this.nextTag++
  }

  /**
   * Get the first node (after begin boundary)
   */
  get first(): ShapeNode | null {
    return this.head.next === this.tail ? null : this.head.next
  }

  /**
   * Get the last node (before end boundary)
   */
  get last(): ShapeNode | null {
    return this.tail.prev === this.head ? null : this.tail.prev
  }

  /**
   * Get begin boundary
   */
  get begin(): ShapeNode {
    return this.head
  }

  /**
   * Get end boundary
   */
  get end(): ShapeNode {
    return this.tail
  }

  /**
   * Get all nodes (excluding boundaries)
   */
  getNodes(): ShapeNode[] {
    const nodes: ShapeNode[] = []
    let current = this.first
    while (current && current !== this.tail) {
      nodes.push(current)
      current = current.next
    }
    return nodes
  }

  /**
   * Insert a node after another node
   */
  insertAfter(target: ShapeNode, newNode: ShapeNode): void {
    newNode.prev = target
    newNode.next = target.next
    if (target.next) {
      target.next.prev = newNode
    }
    target.next = newNode
  }

  /**
   * Insert a node before another node
   */
  insertBefore(target: ShapeNode, newNode: ShapeNode): void {
    newNode.next = target
    newNode.prev = target.prev
    if (target.prev) {
      target.prev.next = newNode
    }
    target.prev = newNode
  }

  /**
   * Append a node to the end (before end boundary)
   */
  append(node: ShapeNode): void {
    this.insertBefore(this.tail, node)
  }

  /**
   * Prepend a node to the beginning (after begin boundary)
   */
  prepend(node: ShapeNode): void {
    this.insertAfter(this.head, node)
  }

  /**
   * Remove a node from the shape
   */
  remove(node: ShapeNode): void {
    if (node.isMargin) {
      throw new Error('Cannot remove boundary markers')
    }

    if (node.prev) {
      node.prev.next = node.next
    }
    if (node.next) {
      node.next.prev = node.prev
    }
  }

  /**
   * Replace a node with another node
   */
  replace(oldNode: ShapeNode, newNode: ShapeNode): void {
    newNode.prev = oldNode.prev
    newNode.next = oldNode.next

    if (oldNode.prev) {
      oldNode.prev.next = newNode
    }
    if (oldNode.next) {
      oldNode.next.prev = newNode
    }
  }

  /**
   * Clone this shape
   */
  clone(): Shape {
    const newShape = new Shape()

    // Copy all nodes
    let current = this.first
    while (current && current !== this.tail) {
      const clonedNode = current.clone()
      clonedNode.tag = this.getNextTag() // Assign new tag
      newShape.append(clonedNode)
      current = current.next
    }

    return newShape
  }

  /**
   * Check if this shape is empty (no segments)
   */
  isEmpty(): boolean {
    return this.first === null
  }

  /**
   * Get the length (number of segments, excluding boundaries)
   */
  get length(): number {
    let count = 0
    let current = this.first
    while (current && current !== this.tail) {
      count++
      current = current.next
    }
    return count
  }

  /**
   * Convert shape to string representation
   */
  toString(): string {
    const segments: string[] = []
    let current = this.first
    while (current && current !== this.tail) {
      segments.push(current.toString())
      current = current.next
    }
    return segments.join('')
  }

  /**
   * Segment a string into a Shape using a character definition table
   */
  static fromString(str: string, charDefTable: CharacterDefinitionTable): Shape {
    const shape = new Shape()

    let pos = 0
    while (pos < str.length) {
      // Try to match longest segment first
      let matched = false
      for (let len = Math.min(str.length - pos, 3); len >= 1; len--) {
        const segment = str.substring(pos, pos + len)
        const features = charDefTable.getFeatures(segment)

        if (features) {
          const node = new ShapeNode(features, shape.getNextTag())
          shape.append(node)
          pos += len
          matched = true
          break
        }
      }

      if (!matched) {
        // Unknown character - create default node
        const unknownFeatures = new FeatureStruct()
        const node = new ShapeNode(unknownFeatures, shape.getNextTag())
        shape.append(node)
        pos++
      }
    }

    return shape
  }

  /**
   * Check if this shape matches another shape exactly
   */
  matches(other: Shape): boolean {
    if (this.length !== other.length) {
      return false
    }

    let thisNode = this.first
    let otherNode = other.first

    while (thisNode && otherNode && thisNode !== this.tail && otherNode !== other.tail) {
      if (!thisNode.featureStruct.subsumes(otherNode.featureStruct) ||
          !otherNode.featureStruct.subsumes(thisNode.featureStruct)) {
        return false
      }
      thisNode = thisNode.next
      otherNode = otherNode.next
    }

    return true
  }
}

// ============================================================================
// Character Definition Table
// ============================================================================

export class CharacterDefinitionTable {
  private definitions: Map<string, FeatureStruct>

  constructor() {
    this.definitions = new Map()
  }

  /**
   * Add a character definition
   */
  define(character: string, features: FeatureStruct): void {
    this.definitions.set(character, features)
  }

  /**
   * Get features for a character/segment
   */
  getFeatures(character: string): FeatureStruct | undefined {
    return this.definitions.get(character)
  }

  /**
   * Check if a character is defined
   */
  has(character: string): boolean {
    return this.definitions.has(character)
  }

  /**
   * Convert a Shape back to a string
   */
  shapeToString(shape: Shape): string {
    const chars: string[] = []
    let current = shape.first

    while (current && current !== shape.end) {
      // Find the character that matches this node's features
      let found = false
      for (const [char, features] of this.definitions) {
        if (features.subsumes(current.featureStruct) &&
            current.featureStruct.subsumes(features)) {
          chars.push(char)
          found = true
          break
        }
      }

      if (!found) {
        chars.push('?') // Unknown segment
      }

      current = current.next
    }

    return chars.join('')
  }

  /**
   * Check if a string matches a shape
   */
  isMatch(str: string, shape: Shape): boolean {
    const strShape = Shape.fromString(str, this)
    return strShape.matches(shape)
  }
}
