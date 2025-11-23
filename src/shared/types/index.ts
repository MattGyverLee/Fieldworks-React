import { z } from 'zod'

// ============================================================================
// Base Types
// ============================================================================

export const GuidSchema = z.string().uuid()

export const MultiStringSchema = z.record(z.string(), z.string())

export const MultiUnicodeSchema = z.record(z.string(), z.string())

// ============================================================================
// Core Data Model
// ============================================================================

export const CmObjectSchema = z.object({
  guid: GuidSchema,
  class: z.string(),
  ownerguid: GuidSchema.optional(),
  dateCreated: z.date(),
  dateModified: z.date()
})

export type CmObject = z.infer<typeof CmObjectSchema>

// ============================================================================
// Lexicon Types
// ============================================================================

export const LexExampleSchema = z.object({
  guid: GuidSchema,
  class: z.literal('LexExampleSentence'),
  ownerguid: GuidSchema.optional(),
  example: MultiStringSchema,
  translation: MultiStringSchema.optional(),
  reference: z.string().optional(),
  dateCreated: z.date(),
  dateModified: z.date()
})

export type LexExample = z.infer<typeof LexExampleSchema>

export const LexSenseSchema = z.object({
  guid: GuidSchema,
  class: z.literal('LexSense'),
  ownerguid: GuidSchema.optional(),
  definition: MultiStringSchema,
  gloss: MultiStringSchema,
  examples: z.array(z.lazy(() => LexExampleSchema)).optional(),
  subsenses: z.array(z.lazy(() => LexSenseSchema)).optional(),
  semanticDomains: z.array(GuidSchema).optional(),
  partOfSpeech: GuidSchema.optional(),
  dateCreated: z.date(),
  dateModified: z.date()
})

export type LexSense = z.infer<typeof LexSenseSchema>

export const LexEntrySchema = z.object({
  guid: GuidSchema,
  class: z.literal('LexEntry'),
  ownerguid: GuidSchema.optional(),
  lexemeForm: z.string(),
  citationForm: z.string().optional(),
  homographNumber: z.number().optional(),
  senses: z.array(LexSenseSchema),
  etymology: z.string().optional(),
  pronunciations: z.array(z.string()).optional(),
  literalMeaning: z.string().optional(),
  bibliography: z.string().optional(),
  restrictions: z.string().optional(),
  summaryDefinition: z.string().optional(),
  dateCreated: z.date(),
  dateModified: z.date(),
  isDirty: z.boolean().optional()
})

export type LexEntry = z.infer<typeof LexEntrySchema>

// ============================================================================
// Text & Discourse Types
// ============================================================================

export const TextSegmentSchema = z.object({
  guid: GuidSchema,
  class: z.literal('Segment'),
  ownerguid: GuidSchema.optional(),
  baselineText: MultiStringSchema,
  freeTranslation: MultiStringSchema.optional(),
  literalTranslation: MultiStringSchema.optional(),
  notes: z.array(z.string()).optional(),
  analyses: z.array(GuidSchema).optional(),
  dateCreated: z.date(),
  dateModified: z.date()
})

export type TextSegment = z.infer<typeof TextSegmentSchema>

export const TextParagraphSchema = z.object({
  guid: GuidSchema,
  class: z.literal('StTxtPara'),
  ownerguid: GuidSchema.optional(),
  contents: MultiStringSchema,
  segments: z.array(TextSegmentSchema).optional(),
  parseIsCurrent: z.boolean().optional(),
  dateCreated: z.date(),
  dateModified: z.date()
})

export type TextParagraph = z.infer<typeof TextParagraphSchema>

export const StTextSchema = z.object({
  guid: GuidSchema,
  class: z.literal('StText'),
  ownerguid: GuidSchema.optional(),
  title: MultiStringSchema,
  paragraphs: z.array(TextParagraphSchema),
  genre: z.string().optional(),
  source: z.string().optional(),
  dateCreated: z.date(),
  dateModified: z.date()
})

export type StText = z.infer<typeof StTextSchema>

// ============================================================================
// Interlinear Analysis Types
// ============================================================================

export const WfiWordformSchema = z.object({
  guid: GuidSchema,
  class: z.literal('WfiWordform'),
  form: MultiStringSchema,
  spellingStatus: z.number().optional(),
  dateCreated: z.date(),
  dateModified: z.date()
})

export type WfiWordform = z.infer<typeof WfiWordformSchema>

export const WfiMorphBundleSchema = z.object({
  guid: GuidSchema,
  class: z.literal('WfiMorphBundle'),
  form: MultiStringSchema,
  gloss: MultiStringSchema,
  sense: GuidSchema.optional(),
  msa: GuidSchema.optional(),
  dateCreated: z.date(),
  dateModified: z.date()
})

export type WfiMorphBundle = z.infer<typeof WfiMorphBundleSchema>

export const WfiAnalysisSchema = z.object({
  guid: GuidSchema,
  class: z.literal('WfiAnalysis'),
  wordform: GuidSchema,
  morphBundles: z.array(WfiMorphBundleSchema),
  category: GuidSchema.optional(),
  dateCreated: z.date(),
  dateModified: z.date()
})

export type WfiAnalysis = z.infer<typeof WfiAnalysisSchema>

// ============================================================================
// Project Types
// ============================================================================

export const WritingSystemSchema = z.object({
  id: z.string(),
  name: z.string(),
  abbreviation: z.string(),
  direction: z.enum(['ltr', 'rtl']),
  font: z.string().optional(),
  keyboard: z.string().optional(),
  isVernacular: z.boolean().optional(),
  isAnalysis: z.boolean().optional()
})

export type WritingSystem = z.infer<typeof WritingSystemSchema>

export const ProjectSchema = z.object({
  guid: GuidSchema,
  name: z.string(),
  description: z.string().optional(),
  filePath: z.string(),
  writingSystems: z.array(WritingSystemSchema),
  vernacularWs: z.string(),
  analysisWs: z.string(),
  lastModified: z.date(),
  createdDate: z.date()
})

export type Project = z.infer<typeof ProjectSchema>

// ============================================================================
// IPC Types
// ============================================================================

export const CreateEntryInputSchema = z.object({
  lexemeForm: z.string().min(1),
  writingSystem: z.string(),
  senses: z.array(z.object({
    definition: MultiStringSchema,
    gloss: MultiStringSchema
  })).optional()
})

export type CreateEntryInput = z.infer<typeof CreateEntryInputSchema>

export const UpdateEntryInputSchema = z.object({
  guid: GuidSchema,
  lexemeForm: z.string().optional(),
  citationForm: z.string().optional(),
  senses: z.array(LexSenseSchema).optional(),
  etymology: z.string().optional()
})

export type UpdateEntryInput = z.infer<typeof UpdateEntryInputSchema>

export const SearchQuerySchema = z.object({
  query: z.string(),
  writingSystem: z.string().optional(),
  limit: z.number().optional().default(100)
})

export type SearchQuery = z.infer<typeof SearchQuerySchema>

export const BulkEditInputSchema = z.object({
  guids: z.array(GuidSchema),
  operation: z.enum(['replace', 'delete', 'copy']),
  field: z.string(),
  find: z.string().optional(),
  replace: z.string().optional(),
  value: z.any().optional()
})

export type BulkEditInput = z.infer<typeof BulkEditInputSchema>

// ============================================================================
// Export Types
// ============================================================================

export const ExportFormatSchema = z.enum(['docx', 'pdf', 'excel', 'lift', 'html'])

export type ExportFormat = z.infer<typeof ExportFormatSchema>

export const ExportOptionsSchema = z.object({
  format: ExportFormatSchema,
  outputPath: z.string(),
  entryGuids: z.array(GuidSchema).optional(),
  includeExamples: z.boolean().optional().default(true),
  includeEtymology: z.boolean().optional().default(true),
  definitionWs: z.string(),
  glossWs: z.string().optional()
})

export type ExportOptions = z.infer<typeof ExportOptionsSchema>

// ============================================================================
// Search Results
// ============================================================================

export const SearchResultSchema = z.object({
  guid: GuidSchema,
  lexemeForm: z.string(),
  citationForm: z.string().optional(),
  highlight: z.string().optional(),
  rank: z.number().optional()
})

export type SearchResult = z.infer<typeof SearchResultSchema>

// ============================================================================
// Validation Result Types
// ============================================================================

export const ValidationErrorSchema = z.object({
  type: z.string(),
  guid: GuidSchema.optional(),
  field: z.string().optional(),
  message: z.string()
})

export type ValidationError = z.infer<typeof ValidationErrorSchema>

export const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(ValidationErrorSchema)
})

export type ValidationResult = z.infer<typeof ValidationResultSchema>

// ============================================================================
// Parser Types
// ============================================================================

export * from './parser'
