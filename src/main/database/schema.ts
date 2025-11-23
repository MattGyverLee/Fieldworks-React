import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

// ============================================================================
// Lexical Entries
// ============================================================================

export const lexicalEntries = sqliteTable('lexical_entries', {
  guid: text('guid').primaryKey(),
  ownerguid: text('owner_guid'),
  lexemeForm: text('lexeme_form').notNull(),
  citationForm: text('citation_form'),
  homographNumber: integer('homograph_number'),
  etymology: text('etymology'),
  literalMeaning: text('literal_meaning'),
  bibliography: text('bibliography'),
  restrictions: text('restrictions'),
  summaryDefinition: text('summary_definition'),
  // Store complex data as JSON
  sensesJson: text('senses_json').notNull().default('[]'),
  pronunciationsJson: text('pronunciations_json').default('[]'),
  dateCreated: integer('date_created', { mode: 'timestamp' }).notNull(),
  dateModified: integer('date_modified', { mode: 'timestamp' }).notNull(),
  isDirty: integer('is_dirty', { mode: 'boolean' }).default(false)
})

export const lexicalSenses = sqliteTable('lexical_senses', {
  guid: text('guid').primaryKey(),
  ownerguid: text('owner_guid').notNull(),
  entryGuid: text('entry_guid').notNull(),
  definitionJson: text('definition_json').notNull(),
  glossJson: text('gloss_json').notNull(),
  examplesJson: text('examples_json').default('[]'),
  subsensesJson: text('subsenses_json').default('[]'),
  semanticDomainsJson: text('semantic_domains_json').default('[]'),
  partOfSpeech: text('part_of_speech'),
  dateCreated: integer('date_created', { mode: 'timestamp' }).notNull(),
  dateModified: integer('date_modified', { mode: 'timestamp' }).notNull()
})

// ============================================================================
// Texts & Discourse
// ============================================================================

export const texts = sqliteTable('texts', {
  guid: text('guid').primaryKey(),
  ownerguid: text('owner_guid'),
  titleJson: text('title_json').notNull(),
  genre: text('genre'),
  source: text('source'),
  description: text('description'),
  abbreviation: text('abbreviation'),
  dateCreated: integer('date_created', { mode: 'timestamp' }).notNull(),
  dateModified: integer('date_modified', { mode: 'timestamp' }).notNull()
})

export const textParagraphs = sqliteTable('text_paragraphs', {
  guid: text('guid').primaryKey(),
  ownerguid: text('owner_guid'),
  textGuid: text('text_guid').notNull(),
  contentsJson: text('contents_json').notNull(),
  segmentsJson: text('segments_json').default('[]'),
  parseIsCurrent: integer('parse_is_current', { mode: 'boolean' }).default(false),
  orderIndex: integer('order_index').notNull(),
  dateCreated: integer('date_created', { mode: 'timestamp' }).notNull(),
  dateModified: integer('date_modified', { mode: 'timestamp' }).notNull()
})

export const textSegments = sqliteTable('text_segments', {
  guid: text('guid').primaryKey(),
  ownerguid: text('owner_guid'),
  paragraphGuid: text('paragraph_guid').notNull(),
  baselineTextJson: text('baseline_text_json').notNull(),
  freeTranslationJson: text('free_translation_json'),
  literalTranslationJson: text('literal_translation_json'),
  notesJson: text('notes_json').default('[]'),
  analysesJson: text('analyses_json').default('[]'),
  orderIndex: integer('order_index').notNull(),
  dateCreated: integer('date_created', { mode: 'timestamp' }).notNull(),
  dateModified: integer('date_modified', { mode: 'timestamp' }).notNull()
})

// ============================================================================
// Interlinear Analysis
// ============================================================================

export const wordforms = sqliteTable('wordforms', {
  guid: text('guid').primaryKey(),
  formJson: text('form_json').notNull(),
  spellingStatus: integer('spelling_status'),
  dateCreated: integer('date_created', { mode: 'timestamp' }).notNull(),
  dateModified: integer('date_modified', { mode: 'timestamp' }).notNull()
})

export const analyses = sqliteTable('analyses', {
  guid: text('guid').primaryKey(),
  wordformGuid: text('wordform_guid').notNull(),
  morphBundlesJson: text('morph_bundles_json').notNull(),
  category: text('category'),
  dateCreated: integer('date_created', { mode: 'timestamp' }).notNull(),
  dateModified: integer('date_modified', { mode: 'timestamp' }).notNull()
})

// ============================================================================
// Project Metadata
// ============================================================================

export const projects = sqliteTable('projects', {
  guid: text('guid').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  filePath: text('file_path').notNull(),
  writingSystemsJson: text('writing_systems_json').notNull(),
  vernacularWs: text('vernacular_ws').notNull(),
  analysisWs: text('analysis_ws').notNull(),
  lastModified: integer('last_modified', { mode: 'timestamp' }).notNull(),
  createdDate: integer('created_date', { mode: 'timestamp' }).notNull()
})

// ============================================================================
// Writing Systems
// ============================================================================

export const writingSystems = sqliteTable('writing_systems', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  abbreviation: text('abbreviation').notNull(),
  direction: text('direction').notNull(), // 'ltr' or 'rtl'
  font: text('font'),
  keyboard: text('keyboard'),
  isVernacular: integer('is_vernacular', { mode: 'boolean' }).default(false),
  isAnalysis: integer('is_analysis', { mode: 'boolean' }).default(false)
})

// ============================================================================
// Semantic Domains
// ============================================================================

export const semanticDomains = sqliteTable('semantic_domains', {
  guid: text('guid').primaryKey(),
  code: text('code').notNull(),
  nameJson: text('name_json').notNull(),
  abbreviationJson: text('abbreviation_json'),
  descriptionJson: text('description_json'),
  questionsJson: text('questions_json').default('[]'),
  parentGuid: text('parent_guid'),
  orderIndex: integer('order_index')
})

// ============================================================================
// Parts of Speech
// ============================================================================

export const partsOfSpeech = sqliteTable('parts_of_speech', {
  guid: text('guid').primaryKey(),
  nameJson: text('name_json').notNull(),
  abbreviationJson: text('abbreviation_json'),
  catalogSourceId: text('catalog_source_id'),
  dateCreated: integer('date_created', { mode: 'timestamp' }).notNull(),
  dateModified: integer('date_modified', { mode: 'timestamp' }).notNull()
})

// ============================================================================
// Undo/Redo History
// ============================================================================

export const history = sqliteTable('history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
  action: text('action').notNull(), // 'create', 'update', 'delete'
  entityType: text('entity_type').notNull(), // 'entry', 'sense', 'text', etc.
  entityGuid: text('entity_guid').notNull(),
  beforeStateJson: text('before_state_json'),
  afterStateJson: text('after_state_json').notNull(),
  userId: text('user_id')
})

// ============================================================================
// Search Tables (Full-Text Search)
// ============================================================================

// Note: FTS5 virtual table created separately via raw SQL
// This is just a placeholder for type safety
export const entriesFts = sqliteTable('entries_fts', {
  rowid: integer('rowid').primaryKey(),
  lexemeForm: text('lexeme_form'),
  citationForm: text('citation_form'),
  definitionText: text('definition_text'),
  glossText: text('gloss_text')
})

// ============================================================================
// Bulk Edit Queue
// ============================================================================

export const bulkEditQueue = sqliteTable('bulk_edit_queue', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
  operation: text('operation').notNull(), // 'replace', 'delete', 'copy'
  field: text('field').notNull(),
  findValue: text('find_value'),
  replaceValue: text('replace_value'),
  affectedGuids: text('affected_guids_json').notNull(),
  status: text('status').notNull().default('pending'), // 'pending', 'completed', 'failed'
  errorMessage: text('error_message')
})

// ============================================================================
// Concordance Cache
// ============================================================================

export const concordanceCache = sqliteTable('concordance_cache', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  wordform: text('wordform').notNull(),
  context: text('context').notNull(),
  textGuid: text('text_guid').notNull(),
  segmentGuid: text('segment_guid').notNull(),
  position: integer('position').notNull(),
  lastUpdated: integer('last_updated', { mode: 'timestamp' }).notNull()
})
