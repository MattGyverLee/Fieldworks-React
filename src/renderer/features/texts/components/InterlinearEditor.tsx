import React, { useState, useMemo } from 'react'
import { Card, Space, Input, Button, Divider, Typography, Empty, Tag, Modal, Collapse, Radio } from 'antd'
import { SaveOutlined, BookOutlined, ThunderboltOutlined, CheckCircleOutlined, ExperimentOutlined } from '@ant-design/icons'
import type { Text, Paragraph } from '../../../stores/textsAtoms'
import type { ParseResult, ParseAnalysis } from '@shared/types'

const { Text: AntText } = Typography

type ParserType = 'xample' | 'hermitcrab'

interface InterlinearEditorProps {
  text: Text
  paragraphs: Paragraph[]
}

interface WordGloss {
  wordform: string
  gloss: string
  morphemes?: { form: string; gloss: string }[]
  parseResult?: ParseResult
}

export const InterlinearEditor: React.FC<InterlinearEditorProps> = ({ text: _text, paragraphs }) => {
  const [selectedWord, setSelectedWord] = useState<{paragraphIndex: number; wordIndex: number} | null>(null)
  const [glossInput, setGlossInput] = useState('')
  const [wordGlosses, setWordGlosses] = useState<Map<string, WordGloss>>(new Map())
  const [parsing, setParsing] = useState(false)
  const [showParseResults, setShowParseResults] = useState(false)
  const [currentParseResult, setCurrentParseResult] = useState<ParseResult | null>(null)
  const [parserType, setParserType] = useState<ParserType>('xample')

  // Parse paragraphs into words
  const paragraphWords = useMemo(() => {
    return paragraphs.map(para => {
      const content = Object.values(para.contents)[0] || ''
      // Simple word tokenization (split by whitespace and punctuation)
      return content.split(/(\s+|[.,!?;:])/).filter(w => w.trim().length > 0)
    })
  }, [paragraphs])

  const handleWordClick = (paragraphIndex: number, wordIndex: number) => {
    setSelectedWord({ paragraphIndex, wordIndex })

    const key = `${paragraphIndex}-${wordIndex}`
    const existing = wordGlosses.get(key)
    setGlossInput(existing?.gloss || '')
    setCurrentParseResult(existing?.parseResult || null)
  }

  const handleSaveGloss = () => {
    if (!selectedWord) return

    const key = `${selectedWord.paragraphIndex}-${selectedWord.wordIndex}`
    const wordform = paragraphWords[selectedWord.paragraphIndex][selectedWord.wordIndex]

    const newGlosses = new Map(wordGlosses)
    newGlosses.set(key, {
      wordform,
      gloss: glossInput,
      parseResult: currentParseResult || undefined
    })
    setWordGlosses(newGlosses)
    setGlossInput('')
    setSelectedWord(null)
    setCurrentParseResult(null)
  }

  const handleParseWord = async () => {
    if (!selectedWord) return

    const wordform = paragraphWords[selectedWord.paragraphIndex][selectedWord.wordIndex]

    try {
      setParsing(true)
      const result = parserType === 'hermitcrab'
        ? await window.api.parser.parseWordHermitCrab(wordform)
        : await window.api.parser.parseWord(wordform)
      setCurrentParseResult(result)
      setShowParseResults(true)
    } catch (error: any) {
      console.error('Error parsing word:', error)
      Modal.error({
        title: 'Parse Error',
        content: error.message || 'Failed to parse word'
      })
    } finally {
      setParsing(false)
    }
  }

  const handleSelectAnalysis = (analysis: ParseAnalysis) => {
    setGlossInput(analysis.gloss)
    setShowParseResults(false)
  }

  const totalWords = paragraphWords.reduce((sum, words) => sum + words.length, 0)
  const glossedWords = wordGlosses.size
  const coverage = totalWords > 0 ? Math.round((glossedWords / totalWords) * 100) : 0

  return (
    <div style={{ padding: '16px' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Stats */}
        <Card size="small">
          <Space size="large">
            <div>
              <AntText type="secondary">Words:</AntText> <AntText strong>{totalWords}</AntText>
            </div>
            <Divider type="vertical" />
            <div>
              <AntText type="secondary">Glossed:</AntText> <AntText strong>{glossedWords}</AntText>
            </div>
            <Divider type="vertical" />
            <div>
              <AntText type="secondary">Coverage:</AntText>{' '}
              <AntText strong style={{ color: coverage > 80 ? '#52c41a' : coverage > 50 ? '#faad14' : '#ff4d4f' }}>
                {coverage}%
              </AntText>
            </div>
          </Space>
        </Card>

        {/* Interlinear Text */}
        {paragraphs.length === 0 ? (
          <Empty description="No paragraphs" />
        ) : (
          paragraphs.map((para, paraIndex) => (
            <Card key={para.guid} size="small">
              <div style={{ fontFamily: 'monospace', lineHeight: '3em' }}>
                {paragraphWords[paraIndex].map((word, wordIndex) => {
                  const key = `${paraIndex}-${wordIndex}`
                  const wordData = wordGlosses.get(key)
                  const isSelected = selectedWord?.paragraphIndex === paraIndex && selectedWord?.wordIndex === wordIndex

                  return (
                    <div
                      key={wordIndex}
                      style={{
                        display: 'inline-block',
                        margin: '0 8px 16px 0',
                        padding: '8px',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? '#e6f7ff' : wordData ? '#f6ffed' : 'transparent',
                        border: isSelected ? '2px solid #1890ff' : wordData ? '1px solid #52c41a' : '1px solid #d9d9d9',
                        borderRadius: '4px',
                        verticalAlign: 'top'
                      }}
                      onClick={() => handleWordClick(paraIndex, wordIndex)}
                    >
                      {/* Gloss line */}
                      {wordData && (
                        <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>
                          {wordData.gloss}
                        </div>
                      )}
                      {/* Wordform line */}
                      <div style={{ fontSize: '14px', fontWeight: wordData ? 'bold' : 'normal' }}>
                        {word}
                      </div>
                      {/* Parse indicator */}
                      {wordData?.parseResult && (
                        <div style={{ fontSize: '10px', color: '#52c41a', marginTop: '2px' }}>
                          <CheckCircleOutlined /> Parsed
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>
          ))
        )}

        {/* Gloss Input Panel */}
        {selectedWord !== null && (
          <Card
            title={
              <Space>
                <BookOutlined />
                <span>Gloss Word: {paragraphWords[selectedWord.paragraphIndex][selectedWord.wordIndex]}</span>
              </Space>
            }
            extra={
              <Button type="link" onClick={() => setSelectedWord(null)}>
                Close
              </Button>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Space>
                  <Button
                    icon={<ThunderboltOutlined />}
                    onClick={handleParseWord}
                    loading={parsing}
                    type="dashed"
                  >
                    Auto-Parse
                  </Button>
                  <Radio.Group
                    value={parserType}
                    onChange={(e) => setParserType(e.target.value)}
                    size="small"
                  >
                    <Radio.Button value="xample">xAMPLE</Radio.Button>
                    <Radio.Button value="hermitcrab">
                      <ExperimentOutlined /> Hermit Crab
                    </Radio.Button>
                  </Radio.Group>
                </Space>
              </Space>
              <Space style={{ width: '100%' }}>
                <Input
                  placeholder="Enter gloss (e.g., walk-PAST-1SG)"
                  value={glossInput}
                  onChange={(e) => setGlossInput(e.target.value)}
                  onPressEnter={handleSaveGloss}
                  style={{ flex: 1 }}
                />
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSaveGloss}
                  disabled={!glossInput}
                >
                  Save
                </Button>
              </Space>

              {/* Parse Results */}
              {showParseResults && currentParseResult && (
                <Card size="small" title="Parse Results" style={{ marginTop: '8px' }}>
                  {currentParseResult.analyses.length === 0 ? (
                    <Empty
                      description="No analyses found. Add morphemes in Grammar view."
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  ) : (
                    <Collapse
                      items={currentParseResult.analyses.map((analysis, idx) => ({
                        key: idx,
                        label: (
                          <Space>
                            <Tag color={analysis.isValid ? 'green' : 'orange'}>
                              {analysis.isValid ? 'Valid' : 'Invalid'}
                            </Tag>
                            <AntText strong>{analysis.gloss}</AntText>
                            <AntText type="secondary">({analysis.category})</AntText>
                          </Space>
                        ),
                        children: (
                          <Space direction="vertical" style={{ width: '100%' }}>
                            <div>
                              <AntText strong>Morphemes:</AntText>
                              <div style={{ marginTop: '8px' }}>
                                {analysis.morphs.map((morph, mIdx) => (
                                  <Tag key={mIdx} color="blue" style={{ marginBottom: '4px' }}>
                                    {morph.form} ({morph.morpheme.gloss})
                                  </Tag>
                                ))}
                              </div>
                            </div>

                            {!analysis.isValid && analysis.violatedConstraints && (
                              <div>
                                <AntText type="danger">Violated Constraints:</AntText>
                                <ul style={{ marginTop: '4px', paddingLeft: '20px' }}>
                                  {analysis.violatedConstraints.map((c, cIdx) => (
                                    <li key={cIdx}>{c}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            <Button
                              type="primary"
                              size="small"
                              onClick={() => handleSelectAnalysis(analysis)}
                            >
                              Use This Analysis
                            </Button>
                          </Space>
                        )
                      }))}
                    />
                  )}
                  <div style={{ marginTop: '8px' }}>
                    <AntText type="secondary" style={{ fontSize: '12px' }}>
                      Parse time: {currentParseResult.parseTime}ms
                    </AntText>
                  </div>
                </Card>
              )}
            </Space>
          </Card>
        )}

        {/* Help Text */}
        <Card size="small" style={{ background: '#fafafa' }}>
          <AntText type="secondary">
            💡 <strong>Tip:</strong> Click a word to gloss it. Use Auto-Parse with either <strong>xAMPLE</strong> (pattern-based)
            or <strong>Hermit Crab</strong> (phonological rules) to automatically analyze words. Green borders indicate glossed words.
          </AntText>
        </Card>
      </Space>
    </div>
  )
}
