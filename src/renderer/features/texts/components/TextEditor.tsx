import React, { useEffect, useState } from 'react'
import { Card, Button, Input, Space, Typography, message, Spin, Tabs } from 'antd'
import { PlusOutlined, SaveOutlined, AlignLeftOutlined, DatabaseOutlined } from '@ant-design/icons'
import type { Text, Paragraph } from '../../../stores/textsAtoms'
import { InterlinearEditor } from './InterlinearEditor'

const { TextArea } = Input
const { Title, Text: AntText } = Typography

interface TextEditorProps {
  text: Text
}

export const TextEditor: React.FC<TextEditorProps> = ({ text }) => {
  const [paragraphs, setParagraphs] = useState<Paragraph[]>([])
  const [loading, setLoading] = useState(false)
  const [editingParagraphId, setEditingParagraphId] = useState<string | null>(null)
  const [editedContent, setEditedContent] = useState('')
  const [activeTab, setActiveTab] = useState('baseline')

  useEffect(() => {
    loadText()
  }, [text.guid])

  const loadText = async () => {
    setLoading(true)
    try {
      const fullText = await window.api.texts.getById(text.guid)
      setParagraphs(fullText.paragraphs || [])
    } catch (error) {
      message.error('Failed to load text')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddParagraph = async () => {
    try {
      const newParagraph = await window.api.texts.addParagraph(text.guid, { en: '' })
      setParagraphs([...paragraphs, newParagraph])
      setEditingParagraphId(newParagraph.guid)
      setEditedContent('')
      message.success('Paragraph added')
    } catch (error) {
      message.error('Failed to add paragraph')
      console.error(error)
    }
  }

  const handleSaveParagraph = async (paragraphGuid: string) => {
    try {
      const updated = await window.api.texts.updateParagraph(paragraphGuid, { en: editedContent })
      setParagraphs(paragraphs.map(p => p.guid === paragraphGuid ? updated : p))
      setEditingParagraphId(null)
      message.success('Paragraph saved')
    } catch (error) {
      message.error('Failed to save paragraph')
      console.error(error)
    }
  }

  const handleEditParagraph = (paragraph: Paragraph) => {
    setEditingParagraphId(paragraph.guid)
    setEditedContent(Object.values(paragraph.contents)[0] || '')
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <Card
        title={<Title level={3}>{Object.values(text.title)[0] || 'Untitled'}</Title>}
        extra={
          <Space>
            <AntText type="secondary">{text.genre || 'No genre'}</AntText>
            <AntText type="secondary">•</AntText>
            <AntText type="secondary">{paragraphs.length} paragraph{paragraphs.length !== 1 ? 's' : ''}</AntText>
          </Space>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'baseline',
              label: (
                <span>
                  <AlignLeftOutlined />
                  Baseline Text
                </span>
              ),
              children: (
                <div>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAddParagraph}
                    style={{ marginBottom: '16px' }}
                  >
                    Add Paragraph
                  </Button>

                  {paragraphs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px', color: '#999' }}>
                      <AlignLeftOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                      <div>No paragraphs yet. Add your first paragraph to begin.</div>
                    </div>
                  ) : (
                    <Space direction="vertical" style={{ width: '100%' }} size="large">
                      {paragraphs.map((paragraph, index) => (
                        <Card
                          key={paragraph.guid}
                          size="small"
                          title={`Paragraph ${index + 1}`}
                          extra={
                            editingParagraphId !== paragraph.guid && (
                              <Button
                                size="small"
                                onClick={() => handleEditParagraph(paragraph)}
                              >
                                Edit
                              </Button>
                            )
                          }
                        >
                          {editingParagraphId === paragraph.guid ? (
                            <div>
                              <TextArea
                                value={editedContent}
                                onChange={(e) => setEditedContent(e.target.value)}
                                autoSize={{ minRows: 3, maxRows: 10 }}
                                placeholder="Enter text content..."
                                style={{ marginBottom: '8px' }}
                              />
                              <Space>
                                <Button
                                  type="primary"
                                  icon={<SaveOutlined />}
                                  onClick={() => handleSaveParagraph(paragraph.guid)}
                                >
                                  Save
                                </Button>
                                <Button onClick={() => setEditingParagraphId(null)}>
                                  Cancel
                                </Button>
                              </Space>
                            </div>
                          ) : (
                            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                              {Object.values(paragraph.contents)[0] || (
                                <span style={{ color: '#999', fontStyle: 'italic' }}>Empty paragraph</span>
                              )}
                            </div>
                          )}
                        </Card>
                      ))}
                    </Space>
                  )}
                </div>
              )
            },
            {
              key: 'interlinear',
              label: (
                <span>
                  <DatabaseOutlined />
                  Interlinear
                </span>
              ),
              children: <InterlinearEditor text={text} paragraphs={paragraphs} />
            }
          ]}
        />
      </Card>
    </div>
  )
}
