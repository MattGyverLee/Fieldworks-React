import React, { useState, useEffect } from 'react'
import { Card, Button, Space, Typography, List, Modal, Form, Input, message, Empty, Tag } from 'antd'
import { ToolOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'

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
  const [partsOfSpeech, setPartsOfSpeech] = useState<PartOfSpeech[]>(DEFAULT_POS)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPOS, setEditingPOS] = useState<PartOfSpeech | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    // Load from localStorage if available
    const saved = localStorage.getItem('partsOfSpeech')
    if (saved) {
      try {
        setPartsOfSpeech(JSON.parse(saved))
      } catch (error) {
        console.error('Error loading parts of speech:', error)
      }
    }
  }, [])

  const savePOS = (updatedPOS: PartOfSpeech[]) => {
    setPartsOfSpeech(updatedPOS)
    localStorage.setItem('partsOfSpeech', JSON.stringify(updatedPOS))
  }

  const handleAdd = () => {
    setEditingPOS(null)
    form.resetFields()
    setIsModalOpen(true)
  }

  const handleEdit = (pos: PartOfSpeech) => {
    setEditingPOS(pos)
    form.setFieldsValue(pos)
    setIsModalOpen(true)
  }

  const handleDelete = (id: string) => {
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

  const handleSubmit = (values: any) => {
    if (editingPOS) {
      // Update existing
      const updated = partsOfSpeech.map(p =>
        p.id === editingPOS.id ? { ...p, ...values } : p
      )
      savePOS(updated)
      message.success('Part of speech updated')
    } else {
      // Add new
      const newPOS: PartOfSpeech = {
        id: Date.now().toString(),
        ...values
      }
      savePOS([...partsOfSpeech, newPOS])
      message.success('Part of speech added')
    }
    setIsModalOpen(false)
    form.resetFields()
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Title level={2}>
              <ToolOutlined /> Grammar & Parts of Speech
            </Title>
            <Paragraph type="secondary">
              Manage grammatical categories and parts of speech for your lexicon.
              These categories help classify entries and provide grammatical information.
            </Paragraph>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4}>Parts of Speech ({partsOfSpeech.length})</Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              Add Part of Speech
            </Button>
          </div>

          {partsOfSpeech.length === 0 ? (
            <Empty
              description="No parts of speech defined"
              style={{ padding: '48px 0' }}
            >
              <Button type="primary" onClick={handleAdd}>
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
                      onClick={() => handleEdit(pos)}
                    >
                      Edit
                    </Button>,
                    <Button
                      key="delete"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDelete(pos.id)}
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

          <Card size="small" style={{ background: '#fafafa' }}>
            <Title level={5}>About Parts of Speech</Title>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>Parts of speech classify words by their grammatical function</li>
              <li>Each lexical entry can be assigned one or more parts of speech</li>
              <li>Abbreviations appear in dictionary entries and analysis</li>
              <li>You can customize this list for your specific language needs</li>
            </ul>
          </Card>
        </Space>
      </Card>

      <Modal
        title={editingPOS ? 'Edit Part of Speech' : 'Add Part of Speech'}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false)
          form.resetFields()
        }}
        onOk={() => form.submit()}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
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
    </div>
  )
}
