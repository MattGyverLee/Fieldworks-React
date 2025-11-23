/**
 * Feature Structures for Hermit Crab
 * TypeScript port of the C# feature structure system
 */

// ============================================================================
// Feature Value Types
// ============================================================================

export type FeatureValue = SymbolicFeatureValue | ComplexFeatureValue | StringFeatureValue | VariableFeatureValue

export interface SymbolicFeatureValue {
  type: 'symbolic'
  symbols: Set<string> // e.g., Set(['+', '-']) for binary features
}

export interface ComplexFeatureValue {
  type: 'complex'
  features: Map<string, FeatureValue> // Nested feature structure
}

export interface StringFeatureValue {
  type: 'string'
  value: string
}

export interface VariableFeatureValue {
  type: 'variable'
  name: string
  binding?: FeatureValue // Resolved value during unification
}

// ============================================================================
// Feature Structure
// ============================================================================

export class FeatureStruct {
  private features: Map<string, FeatureValue>

  constructor(features?: Map<string, FeatureValue>) {
    this.features = features || new Map()
  }

  /**
   * Get a feature value
   */
  get(featureName: string): FeatureValue | undefined {
    return this.features.get(featureName)
  }

  /**
   * Set a feature value
   */
  set(featureName: string, value: FeatureValue): void {
    this.features.set(featureName, value)
  }

  /**
   * Check if a feature exists
   */
  has(featureName: string): boolean {
    return this.features.has(featureName)
  }

  /**
   * Get all feature names
   */
  getFeatureNames(): string[] {
    return Array.from(this.features.keys())
  }

  /**
   * Clone this feature structure
   */
  clone(): FeatureStruct {
    const newFeatures = new Map<string, FeatureValue>()
    for (const [name, value] of this.features) {
      newFeatures.set(name, this.cloneValue(value))
    }
    return new FeatureStruct(newFeatures)
  }

  private cloneValue(value: FeatureValue): FeatureValue {
    switch (value.type) {
      case 'symbolic':
        return { type: 'symbolic', symbols: new Set(value.symbols) }
      case 'complex':
        const newFeatures = new Map<string, FeatureValue>()
        for (const [name, val] of value.features) {
          newFeatures.set(name, this.cloneValue(val))
        }
        return { type: 'complex', features: newFeatures }
      case 'string':
        return { type: 'string', value: value.value }
      case 'variable':
        return {
          type: 'variable',
          name: value.name,
          binding: value.binding ? this.cloneValue(value.binding) : undefined
        }
    }
  }

  /**
   * Test if this feature structure is unifiable with another
   */
  isUnifiable(other: FeatureStruct, varBindings?: VariableBindings): boolean {
    const bindings = varBindings ? varBindings.clone() : new VariableBindings()
    const result = this.unify(other, bindings, false)
    return result !== null
  }

  /**
   * Unify this feature structure with another (non-destructive)
   * Returns a new unified feature structure, or null if unification fails
   */
  unify(other: FeatureStruct, varBindings?: VariableBindings, useDefaults: boolean = true): FeatureStruct | null {
    const bindings = varBindings || new VariableBindings()

    // Create result structure
    const result = this.clone()

    // Unify each feature from other
    for (const [name, otherValue] of other.features) {
      const thisValue = result.get(name)

      if (!thisValue) {
        // Feature only in other - add it
        result.set(name, this.cloneValue(otherValue))
      } else {
        // Feature in both - must unify values
        const unified = this.unifyValues(thisValue, otherValue, bindings, useDefaults)
        if (unified === null) {
          return null // Unification failed
        }
        result.set(name, unified)
      }
    }

    return result
  }

  private unifyValues(
    val1: FeatureValue,
    val2: FeatureValue,
    bindings: VariableBindings,
    useDefaults: boolean
  ): FeatureValue | null {
    // Dereference variables
    const v1 = this.dereferenceVariable(val1, bindings)
    const v2 = this.dereferenceVariable(val2, bindings)

    // Variable unification
    if (v1.type === 'variable') {
      bindings.bind(v1.name, v2)
      return v2
    }
    if (v2.type === 'variable') {
      bindings.bind(v2.name, v1)
      return v1
    }

    // Type mismatch
    if (v1.type !== v2.type) {
      return null
    }

    // Unify by type
    switch (v1.type) {
      case 'symbolic':
        return this.unifySymbolic(v1, v2 as SymbolicFeatureValue)

      case 'complex':
        return this.unifyComplex(v1, v2 as ComplexFeatureValue, bindings, useDefaults)

      case 'string':
        return this.unifyString(v1, v2 as StringFeatureValue)

      default:
        return null
    }
  }

  private dereferenceVariable(value: FeatureValue, bindings: VariableBindings): FeatureValue {
    if (value.type === 'variable') {
      const bound = bindings.get(value.name)
      if (bound) {
        // Follow binding chain
        return this.dereferenceVariable(bound, bindings)
      }
    }
    return value
  }

  private unifySymbolic(val1: SymbolicFeatureValue, val2: SymbolicFeatureValue): FeatureValue | null {
    // Intersection of symbol sets
    const intersection = new Set<string>()
    for (const sym of val1.symbols) {
      if (val2.symbols.has(sym)) {
        intersection.add(sym)
      }
    }

    if (intersection.size === 0) {
      return null // No compatible symbols
    }

    return { type: 'symbolic', symbols: intersection }
  }

  private unifyComplex(
    val1: ComplexFeatureValue,
    val2: ComplexFeatureValue,
    bindings: VariableBindings,
    useDefaults: boolean
  ): FeatureValue | null {
    const unifiedFeatures = new Map<string, FeatureValue>()

    // Collect all feature names
    const allNames = new Set([...val1.features.keys(), ...val2.features.keys()])

    for (const name of allNames) {
      const f1 = val1.features.get(name)
      const f2 = val2.features.get(name)

      if (f1 && f2) {
        // Both have feature - must unify
        const unified = this.unifyValues(f1, f2, bindings, useDefaults)
        if (unified === null) {
          return null
        }
        unifiedFeatures.set(name, unified)
      } else if (f1) {
        // Only val1 has it
        unifiedFeatures.set(name, this.cloneValue(f1))
      } else if (f2) {
        // Only val2 has it
        unifiedFeatures.set(name, this.cloneValue(f2))
      }
    }

    return { type: 'complex', features: unifiedFeatures }
  }

  private unifyString(val1: StringFeatureValue, val2: StringFeatureValue): FeatureValue | null {
    if (val1.value === val2.value) {
      return val1
    }
    return null // Strings must match exactly
  }

  /**
   * Subsumption: Does this feature structure subsume (is more general than) another?
   */
  subsumes(other: FeatureStruct): boolean {
    // This subsumes other if all features in this are compatible with other
    for (const [name, thisValue] of this.features) {
      const otherValue = other.get(name)

      if (!otherValue) {
        // Feature in this but not in other - doesn't subsume
        return false
      }

      if (!this.valueSubsumes(thisValue, otherValue)) {
        return false
      }
    }

    return true
  }

  private valueSubsumes(val1: FeatureValue, val2: FeatureValue): boolean {
    if (val1.type !== val2.type) {
      return false
    }

    switch (val1.type) {
      case 'symbolic':
        const v2 = val2 as SymbolicFeatureValue
        // val1 subsumes val2 if val2's symbols are subset of val1's
        for (const sym of v2.symbols) {
          if (!val1.symbols.has(sym)) {
            return false
          }
        }
        return true

      case 'complex':
        const cv2 = val2 as ComplexFeatureValue
        for (const [name, v1] of val1.features) {
          const v2 = cv2.features.get(name)
          if (!v2 || !this.valueSubsumes(v1, v2)) {
            return false
          }
        }
        return true

      case 'string':
        return (val1 as StringFeatureValue).value === (val2 as StringFeatureValue).value

      case 'variable':
        return true // Variables subsume anything

      default:
        return false
    }
  }

  /**
   * Convert to readable string representation
   */
  toString(): string {
    const parts: string[] = []
    for (const [name, value] of this.features) {
      parts.push(`${name}: ${this.valueToString(value)}`)
    }
    return `[${parts.join(', ')}]`
  }

  private valueToString(value: FeatureValue): string {
    switch (value.type) {
      case 'symbolic':
        return Array.from(value.symbols).join('|')
      case 'complex':
        const parts: string[] = []
        for (const [name, val] of value.features) {
          parts.push(`${name}: ${this.valueToString(val)}`)
        }
        return `{${parts.join(', ')}}`
      case 'string':
        return `"${value.value}"`
      case 'variable':
        return `?${value.name}${value.binding ? `=${this.valueToString(value.binding)}` : ''}`
    }
  }
}

// ============================================================================
// Variable Bindings
// ============================================================================

export class VariableBindings {
  private bindings: Map<string, FeatureValue>

  constructor() {
    this.bindings = new Map()
  }

  bind(variableName: string, value: FeatureValue): void {
    this.bindings.set(variableName, value)
  }

  get(variableName: string): FeatureValue | undefined {
    return this.bindings.get(variableName)
  }

  clone(): VariableBindings {
    const newBindings = new VariableBindings()
    for (const [name, value] of this.bindings) {
      newBindings.bindings.set(name, value)
    }
    return newBindings
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a binary feature value (+ or -)
 */
export function binaryFeature(value: '+' | '-'): SymbolicFeatureValue {
  return { type: 'symbolic', symbols: new Set([value]) }
}

/**
 * Create a symbolic feature value from multiple symbols
 */
export function symbolicFeature(...symbols: string[]): SymbolicFeatureValue {
  return { type: 'symbolic', symbols: new Set(symbols) }
}

/**
 * Create a string feature value
 */
export function stringFeature(value: string): StringFeatureValue {
  return { type: 'string', value }
}

/**
 * Create a variable feature value
 */
export function variableFeature(name: string): VariableFeatureValue {
  return { type: 'variable', name }
}

/**
 * Create a complex feature value
 */
export function complexFeature(features: Record<string, FeatureValue>): ComplexFeatureValue {
  return {
    type: 'complex',
    features: new Map(Object.entries(features))
  }
}
