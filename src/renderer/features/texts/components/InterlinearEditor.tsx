import React, { useState, useMemo } from 'react'
import { Card, Space, Input, Button, Divider, Typography, Empty, Tag } from 'antd'
import { SaveOutlined, BookOutlined } from '@ant-design/icons'
import type { Text, Paragraph } from '../../../stores/textsAtoms'

const { Text: AntText } = Typography

interface InterlinearEditorProps {
  text: Text
  paragraphs: Paragraph[]
}

interface WordGloss {
  wordform: string
  gloss: string
  morphemes?: { form: string; gloss: string }[]
}

export const InterlinearEditor: React.FC<InterlinearEditorProps> = ({ text: _text, paragraphs }) => {
  const [selectedWord, setSelectedWord] = useState<{paragraphIndex: number; wordIndex: number} | null>(null)
  const [glossInput, setGlossInput] = useState('')
  const [wordGlosses, setWordGlosses] = useState<Map<string, WordGloss>>(new Map())

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
  }

  const handleSaveGloss = () => {
    if (!selectedWord) return

    const word = paragraphWords[selectedWord.paragraphIndex][selectedWord.wordIndex]
    const key = `${selectedWord.paragraphIndex}-${selectedWord.wordIndex}`

    const newGlosses = new Map(wordGlosses)
    newGlosses.set(key, {
      wordform: word,
      gloss: glossInput
    })
    setWordGlosses(newGlosses)
    setSelectedWord(null)
    setGlossInput('')
  }

  const getWordKey = (paraIndex: number, wordIndex: number) =>
    `${paraIndex}-${wordIndex}`

  if (paragraphs.length === 0) {
    return (
      <Empty
        image={<BookOutlined style={{ fontSize: '48px', color: '#ccc' }} />}
        description="No baseline text to analyze"
      >
        <p style={{ color: '#999' }}>
          Add paragraphs in the Baseline Text tab first
        </p>
      </Empty>
    )
  }

  return (
    <div>
      <Card
        size="small"
        style={{ marginBottom: '16px', background: '#fafafa' }}
        title="Interlinear Analysis"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <AntText type="secondary">
            Click on any word to add a gloss. Glosses appear below each word.
          </AntText>

          {selectedWord && (
            <Card size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <strong>Analyzing:</strong> {paragraphWords[selectedWord.paragraphIndex][selectedWord.wordIndex]}
                </div>
                <Input
                  placeholder="Enter gloss..."
                  value={glossInput}
                  onChange={(e) => setGlossInput(e.target.value)}
                  onPressEnter={handleSaveGloss}
                  suffix={
                    <Button
                      type="primary"
                      size="small"
                      icon={<SaveOutlined />}
                      onClick={handleSaveGloss}
                    >
                      Save
                    </Button>
                  }
                />
              </Space>
            </Card>
          )}

          <Divider style={{ margin: '12px 0' }} />

          <div style={{
            padding: '16px',
            background: '#fff',
            border: '1px solid #d9d9d9',
            borderRadius: '4px'
          }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {paragraphWords.map((words, paraIndex) => (
                <div key={paraIndex}>
                  <Tag color="blue">Paragraph {paraIndex + 1}</Tag>
                  <div style={{ marginTop: '12px' }}>
                    <Space wrap size="large">
                      {words.map((word, wordIndex) => {
                        const key = getWordKey(paraIndex, wordIndex)
                        const gloss = wordGlosses.get(key)
                        const isSelected = selectedWord?.paragraphIndex === paraIndex &&
                                         selectedWord?.wordIndex === wordIndex

                        // Skip whitespace-only words
                        if (word.trim().length === 0) return null

                        // Display punctuation inline
                        if (/^[.,!?;:]$/.test(word)) {
                          return <span key={wordIndex} style={{ marginLeft: '-8px' }}>{word}</span>
                        }

                        return (
                          <div
                            key={wordIndex}
                            style={{
                              display: 'inline-flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              cursor: 'pointer',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              background: isSelected ? '#e6f7ff' :
                                         gloss ? '#f6ffed' : 'transparent',
                              border: isSelected ? '2px solid #1890ff' :
                                     gloss ? '1px solid #b7eb8f' : '1px solid transparent'
                            }}
                            onClick={() => handleWordClick(paraIndex, wordIndex)}
                          >
                            <div style={{
                              fontWeight: 500,
                              fontSize: '15px',
                              marginBottom: '4px'
                            }}>
                              {word}
                            </div>
                            <div style={{
                              fontSize: '12px',
                              color: gloss ? '#52c41a' : '#999',
                              fontStyle: gloss ? 'normal' : 'italic',
                              minHeight: '18px'
                            }}>
                              {gloss?.gloss || 'no gloss'}
                            </div>
                          </div>
                        )
                      })}
                    </Space>
                  </div>
                </div>
              ))}
            </Space>
          </div>

          <Card size="small" title="Statistics" style={{ background: '#fafafa' }}>
            <Space split={<Divider type="vertical" />}>
              <AntText>
                <strong>{paragraphs.length}</strong> paragraph{paragraphs.length !== 1 ? 's' : ''}
              </AntText>
              <AntText>
                <strong>{paragraphWords.reduce((sum, words) => sum + words.filter(w => w.trim().length > 0 && !/^[.,!?;:]$/.test(w)).length, 0)}</strong> words
              </AntText>
              <AntText>
                <strong>{wordGlosses.size}</strong> glossed
              </AntText>
              <AntText>
                <strong>
                  {Math.round((wordGlosses.size / Math.max(1, paragraphWords.reduce((sum, words) => sum + words.filter(w => w.trim().length > 0 && !/^[.,!?;:]$/.test(w)).length, 0))) * 100)}%
                </strong> complete
              </AntText>
            </Space>
          </Card>
        </Space>
      </Card>
    </div>
  )
}
