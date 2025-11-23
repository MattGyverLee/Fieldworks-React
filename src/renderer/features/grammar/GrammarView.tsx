import React, { useState, useEffect } from 'react'
import { Card, Button, Space, Typography, List, Modal, Form, Input, message, Empty, Tag, Tabs, Select } from 'antd'
import { ToolOutlined, PlusOutlined, EditOutlined, DeleteOutlined, ExperimentOutlined } from '@ant-design/icons'
import type { Morpheme, MorphemeType } from '@shared/types'

const { Title, Paragraph, Text: AntText } = Typography

interface PartOfSpeech {
  id: string
  name: string
  abbreviation: string
  description?: string
}

// Default Parts of Speech from FieldWorks
const DEFAULT_POS: PartOfSpeech[] = [
  { id: '1', name: 'Noun', abbreviation: 'n', description: 'Person, place, thing, or idea' },
  { id: '2', name: 'Verb', abbreviation: 'v', description: 'Action or state of being' },
  { id: '3', name: 'Adjective', abbreviation: 'adj', description: 'Modifies a noun' },
  { id: '4', name: 'Adverb', abbreviation: 'adv', description: 'Modifies a verb, adjective, or adverb' },
  { id: '5', name: 'Pronoun', abbreviation: 'pro', description: 'Replaces a noun' },
  { id: '6', name: 'Preposition', abbreviation: 'prep', description: 'Shows relationship' },
  { id: '7', name: 'Conjunction', abbreviation: 'conj', description: 'Connects words or clauses' },
  { id: '8', name: 'Interjection', abbreviation: 'interj', description: 'Expresses emotion' },
  { id: '9', name: 'Determiner', abbreviation: 'det', description: 'Specifies a noun' },
  { id: '10', name: 'Particle', abbreviation: 'part', description: 'Function word' }
]

export const GrammarView: React.FC = () => {
  // Parts of Speech state
  const [partsOfSpeech, setPartsOfSpeech] = useState<PartOfSpeech[]>(DEFAULT_POS)
  const [isPOSModalOpen, setIsPOSModalOpen] = useState(false)
  const [editingPOS, setEditingPOS] = useState<PartOfSpeech | null>(null)
  const [posForm] = Form.useForm()

  // Morphemes state
  const [morphemes, setMorphemes] = useState<Morpheme[]>([])
  const [isMorphModalOpen, setIsMorphModalOpen] = useState(false)
  const [editingMorpheme, setEditingMorpheme] = useState<Morpheme | null>(null)
  const [morphForm] = Form.useForm()
  const [loadingMorphemes, setLoadingMorphemes] = useState(false)

  // Load POS from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('partsOfSpeech')
    if (saved) {
      try {
        setPartsOfSpeech(JSON.parse(saved))
      } catch (error) {
        console.error('Error loading parts of speech:', error)
      }
    }
  }, [])

  // Load morphemes from database
  useEffect(() => {
    loadMorphemes()
  }, [])

  const loadMorphemes = async () => {
    try {
      setLoadingMorphemes(true)
      const morphs = await window.api.parser.getMorphemes()
      setMorphemes(morphs)
    } catch (error: any) {
      console.error('Error loading morphemes:', error)
      message.error('Failed to load morphemes')
    } finally {
      setLoadingMorphemes(false)
    }
  }

  const savePOS = (updatedPOS: PartOfSpeech[]) => {
    setPartsOfSpeech(updatedPOS)
    localStorage.setItem('partsOfSpeech', JSON.stringify(updatedPOS))
  }

  // POS handlers
  const handleAddPOS = () => {
    setEditingPOS(null)
    posForm.resetFields()
    setIsPOSModalOpen(true)
  }

  const handleEditPOS = (pos: PartOfSpeech) => {
    setEditingPOS(pos)
    posForm.setFieldsValue(pos)
    setIsPOSModalOpen(true)
  }

  const handleDeletePOS = (id: string) => {
    Modal.confirm({
      title: 'Delete Part of Speech',
      content: 'Are you sure you want to delete this part of speech? This may affect existing entries.',
      okText: 'Delete',
      okType: 'danger',
      onOk: () => {
        const updated = partsOfSpeech.filter(p => p.id !== id)
        savePOS(updated)
        message.success('Part of speech deleted')
      }
    })
  }

  const handleSubmitPOS = (values: any) => {
    if (editingPOS) {
      const updated = partsOfSpeech.map(p =>
        p.id === editingPOS.id ? { ...p, ...values } : p
      )
      savePOS(updated)
      message.success('Part of speech updated')
    } else {
      const newPOS: PartOfSpeech = {
        id: Date.now().toString(),
        ...values
      }
      savePOS([...partsOfSpeech, newPOS])
      message.success('Part of speech added')
    }
    setIsPOSModalOpen(false)
    posForm.resetFields()
  }

  // Morpheme handlers
  const handleAddMorpheme = () => {
    setEditingMorpheme(null)
    morphForm.resetFields()
    setIsMorphModalOpen(true)
  }

  const handleEditMorpheme = (morpheme: Morpheme) => {
    setEditingMorpheme(morpheme)
    morphForm.setFieldsValue(morpheme)
    setIsMorphModalOpen(true)
  }

  const handleDeleteMorpheme = (id: string) => {
    Modal.confirm({
      title: 'Delete Morpheme',
      content: 'Are you sure you want to delete this morpheme?',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await window.api.parser.deleteMorpheme(id)
          message.success('Morpheme deleted')
          loadMorphemes()
        } catch (error: any) {
          message.error('Failed to delete morpheme')
        }
      }
    })
  }

  const handleSubmitMorpheme = async (values: any) => {
    try {
      if (editingMorpheme) {
        await window.api.parser.updateMorpheme(editingMorpheme.id, values)
        message.success('Morpheme updated')
      } else {
        await window.api.parser.createMorpheme(values)
        message.success('Morpheme added')
      }
      setIsMorphModalOpen(false)
      morphForm.resetFields()
      loadMorphemes()
    } catch (error: any) {
      message.error(`Failed to ${editingMorpheme ? 'update' : 'add'} morpheme`)
    }
  }

  const morphemeTypes: MorphemeType[] = ['prefix', 'root', 'suffix', 'infix', 'circumfix']

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Title level={2}>
              <ToolOutlined /> Grammar & Morphology
            </Title>
            <Paragraph type="secondary">
              Manage grammatical categories, parts of speech, and morphemes for morphological parsing.
            </Paragraph>
          </div>

          <Tabs
            defaultActiveKey="pos"
            items={[
              {
                key: 'pos',
                label: (
                  <span>
                    <ToolOutlined /> Parts of Speech
                  </span>
                ),
                children: (
                  <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Title level={4}>Parts of Speech ({partsOfSpeech.length})</Title>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleAddPOS}
                      >
                        Add Part of Speech
                      </Button>
                    </div>

                    {partsOfSpeech.length === 0 ? (
                      <Empty description="No parts of speech defined">
                        <Button type="primary" onClick={handleAddPOS}>
                          Add First Part of Speech
                        </Button>
                      </Empty>
                    ) : (
                      <List
                        dataSource={partsOfSpeech}
                        renderItem={(pos) => (
                          <List.Item
                            key={pos.id}
                            actions={[
                              <Button
                                key="edit"
                                type="text"
                                icon={<EditOutlined />}
                                onClick={() => handleEditPOS(pos)}
                              >
                                Edit
                              </Button>,
                              <Button
                                key="delete"
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => handleDeletePOS(pos.id)}
                              >
                                Delete
                              </Button>
                            ]}
                          >
                            <List.Item.Meta
                              title={
                                <Space>
                                  <AntText strong>{pos.name}</AntText>
                                  <Tag color="blue">{pos.abbreviation}</Tag>
                                </Space>
                              }
                              description={pos.description || 'No description'}
                            />
                          </List.Item>
                        )}
                      />
                    )}
                  </Space>
                )
              },
              {
                key: 'morphemes',
                label: (
                  <span>
                    <ExperimentOutlined /> Morphemes ({morphemes.length})
                  </span>
                ),
                children: (
                  <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Title level={4}>Morpheme Dictionary ({morphemes.length})</Title>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleAddMorpheme}
                      >
                        Add Morpheme
                      </Button>
                    </div>

                    {morphemes.length === 0 ? (
                      <Empty description="No morphemes defined">
                        <Button type="primary" onClick={handleAddMorpheme}>
                          Add First Morpheme
                        </Button>
                      </Empty>
                    ) : (
                      <List
                        loading={loadingMorphemes}
                        dataSource={morphemes}
                        renderItem={(morph) => (
                          <List.Item
                            key={morph.id}
                            actions={[
                              <Button
                                key="edit"
                                type="text"
                                icon={<EditOutlined />}
                                onClick={() => handleEditMorpheme(morph)}
                              >
                                Edit
                              </Button>,
                              <Button
                                key="delete"
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => handleDeleteMorpheme(morph.id)}
                              >
                                Delete
                              </Button>
                            ]}
                          >
                            <List.Item.Meta
                              title={
                                <Space>
                                  <AntText strong>{morph.form}</AntText>
                                  <Tag color="green">{morph.type}</Tag>
                                  <Tag color="blue">{morph.category}</Tag>
                                </Space>
                              }
                              description={`Gloss: ${morph.gloss}`}
                            />
                          </List.Item>
                        )}
                      />
                    )}

                    <Card size="small" style={{ background: '#fafafa' }}>
                      <Title level={5}>About Morphemes</Title>
                      <ul style={{ margin: 0, paddingLeft: '20px' }}>
                        <li><strong>Prefix:</strong> Attached before a root (un-, re-, pre-)</li>
                        <li><strong>Root:</strong> Core meaning-bearing element (walk, book, happy)</li>
                        <li><strong>Suffix:</strong> Attached after a root (-ing, -ed, -ly)</li>
                        <li><strong>Infix:</strong> Inserted within a root (rare in English)</li>
                        <li>These morphemes power automatic word parsing in the Interlinear Editor</li>
                      </ul>
                    </Card>
                  </Space>
                )
              }
            ]}
          />
        </Space>
      </Card>

      {/* POS Modal */}
      <Modal
        title={editingPOS ? 'Edit Part of Speech' : 'Add Part of Speech'}
        open={isPOSModalOpen}
        onCancel={() => {
          setIsPOSModalOpen(false)
          posForm.resetFields()
        }}
        onOk={() => posForm.submit()}
      >
        <Form
          form={posForm}
          layout="vertical"
          onFinish={handleSubmitPOS}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input placeholder="e.g., Noun, Verb, Adjective" />
          </Form.Item>

          <Form.Item
            name="abbreviation"
            label="Abbreviation"
            rules={[
              { required: true, message: 'Please enter an abbreviation' },
              { max: 10, message: 'Abbreviation must be 10 characters or less' }
            ]}
          >
            <Input placeholder="e.g., n, v, adj" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea
              rows={3}
              placeholder="Optional description of this grammatical category"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Morpheme Modal */}
      <Modal
        title={editingMorpheme ? 'Edit Morpheme' : 'Add Morpheme'}
        open={isMorphModalOpen}
        onCancel={() => {
          setIsMorphModalOpen(false)
          morphForm.resetFields()
        }}
        onOk={() => morphForm.submit()}
      >
        <Form
          form={morphForm}
          layout="vertical"
          onFinish={handleSubmitMorpheme}
        >
          <Form.Item
            name="form"
            label="Form"
            rules={[{ required: true, message: 'Please enter the morpheme form' }]}
          >
            <Input placeholder="e.g., un-, walk, -ing" />
          </Form.Item>

          <Form.Item
            name="type"
            label="Type"
            rules={[{ required: true, message: 'Please select a type' }]}
          >
            <Select placeholder="Select morpheme type">
              {morphemeTypes.map(type => (
                <Select.Option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="category"
            label="Category (Part of Speech)"
            rules={[{ required: true, message: 'Please enter a category' }]}
          >
            <Select placeholder="Select part of speech">
              {partsOfSpeech.map(pos => (
                <Select.Option key={pos.id} value={pos.abbreviation}>
                  {pos.name} ({pos.abbreviation})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="gloss"
            label="Gloss"
            rules={[{ required: true, message: 'Please enter a gloss' }]}
          >
            <Input placeholder="e.g., NEG, walk, PROG" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
