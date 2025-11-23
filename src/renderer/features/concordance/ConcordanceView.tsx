import React, { useState, useEffect } from 'react'
import { Card, Input, List, Typography, Tag, Space, Empty, Spin } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { useAtomValue, useSetAtom } from 'jotai'
import { textsAtom, loadTextsAtom } from '../../stores/textsAtoms'

const { Title, Text: AntText } = Typography
const { Search } = Input

interface ConcordanceResult {
  textGuid: string
  textTitle: string
  paragraphIndex: number
  context: string
  position: number
}

export const ConcordanceView: React.FC = () => {
  const texts = useAtomValue(textsAtom)
  const loadTexts = useSetAtom(loadTextsAtom)

  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<ConcordanceResult[]>([])
  const [searching, setSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    if (texts.size === 0) {
      loadTexts()
    }
  }, [loadTexts, texts.size])

  const handleSearch = async (value: string) => {
    if (!value.trim()) {
      setResults([])
      setHasSearched(false)
      return
    }

    setSearching(true)
    setHasSearched(true)
    setSearchTerm(value)

    try {
      const searchResults: ConcordanceResult[] = []
      const searchLower = value.toLowerCase()

      // Search through all texts and paragraphs
      for (const text of Array.from(texts.values())) {
        // Load full text with paragraphs
        const fullText = await window.api.texts.getById(text.guid)

        if (fullText.paragraphs) {
          fullText.paragraphs.forEach((para: any, paraIndex: number) => {
            const content = Object.values(para.contents)[0] as string || ''
            const contentLower = content.toLowerCase()

            // Find all occurrences
            let position = 0
            while ((position = contentLower.indexOf(searchLower, position)) !== -1) {
              // Extract context (50 chars before and after)
              const contextStart = Math.max(0, position - 50)
              const contextEnd = Math.min(content.length, position + value.length + 50)
              let context = content.substring(contextStart, contextEnd)

              // Add ellipsis if truncated
              if (contextStart > 0) context = '...' + context
              if (contextEnd < content.length) context = context + '...'

              // Highlight the search term in context
              const highlightedContext = context.replace(
                new RegExp(`(${value})`, 'gi'),
                '<mark>$1</mark>'
              )

              searchResults.push({
                textGuid: text.guid,
                textTitle: Object.values(text.title)[0] || 'Untitled',
                paragraphIndex: paraIndex,
                context: highlightedContext,
                position
              })

              position += value.length
            }
          })
        }
      }

      setResults(searchResults)
    } catch (error) {
      console.error('Error searching:', error)
    } finally {
      setSearching(false)
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Title level={2}>
              <SearchOutlined /> Concordance
            </Title>
            <AntText type="secondary">
              Search for words and phrases across all texts to see them in context
            </AntText>
          </div>

          <Search
            placeholder="Enter word or phrase to search..."
            size="large"
            onSearch={handleSearch}
            loading={searching}
            allowClear
            enterButton="Search"
          />

          {searching ? (
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <Spin size="large" />
              <div style={{ marginTop: '16px', color: '#999' }}>
                Searching through texts...
              </div>
            </div>
          ) : hasSearched ? (
            results.length > 0 ? (
              <div>
                <Card size="small" style={{ marginBottom: '16px', background: '#fafafa' }}>
                  <AntText strong>
                    Found {results.length} occurrence{results.length !== 1 ? 's' : ''} of "{searchTerm}"
                  </AntText>
                </Card>

                <List
                  dataSource={results}
                  renderItem={(result, index) => (
                    <List.Item key={index}>
                      <List.Item.Meta
                        title={
                          <Space>
                            <Tag color="blue">{result.textTitle}</Tag>
                            <AntText type="secondary">Paragraph {result.paragraphIndex + 1}</AntText>
                          </Space>
                        }
                        description={
                          <div
                            style={{
                              fontSize: '15px',
                              lineHeight: 1.8,
                              padding: '8px 0'
                            }}
                            dangerouslySetInnerHTML={{ __html: result.context }}
                          />
                        }
                      />
                    </List.Item>
                  )}
                  pagination={{
                    pageSize: 20,
                    showSizeChanger: false,
                    showTotal: (total) => `Total ${total} results`
                  }}
                />
              </div>
            ) : (
              <Empty
                description={`No results found for "${searchTerm}"`}
                style={{ padding: '48px 0' }}
              />
            )
          ) : (
            <Empty
              image={<SearchOutlined style={{ fontSize: '48px', color: '#ccc' }} />}
              description="Enter a search term to find words in context"
              style={{ padding: '48px 0' }}
            />
          )}
        </Space>
      </Card>

      <style>
        {`
          mark {
            background-color: #fffb8f;
            padding: 2px 4px;
            border-radius: 2px;
            font-weight: 600;
          }
        `}
      </style>
    </div>
  )
}
