import React, { useEffect, useState } from 'react'
import { Form, Input, Button, Card, Space, Divider, Collapse, message } from 'antd'
import { PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons'
import { useAtom } from 'jotai'
import { entryAtomFamily } from '../../../stores/lexiconAtoms'
import type { LexEntry, LexSense } from '@shared/types'

const { TextArea } = Input
const { Panel } = Collapse

interface EntryEditorProps {
  entryGuid: string
}

export const EntryEditor: React.FC<EntryEditorProps> = ({ entryGuid }) => {
  const [entry, setEntry] = useAtom(entryAtomFamily(entryGuid))
  const [form] = Form.useForm()
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (entry) {
      form.setFieldsValues({
        lexemeForm: entry.lexemeForm,
        citationForm: entry.citationForm || '',
        homographNumber: entry.homographNumber || '',
        etymology: entry.etymology || ''
      })
    }
  }, [entry, form])

  if (!entry) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#999' }}>
        Entry not found
      </div>
    )
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()

      const updatedEntry: LexEntry = {
        ...entry,
        lexemeForm: values.lexemeForm,
        citationForm: values.citationForm || undefined,
        homographNumber: values.homographNumber || undefined,
        etymology: values.etymology || undefined,
        dateModified: new Date()
      }

      // Update local state
      setEntry(updatedEntry)

      // Save to database via IPC
      await window.api.lexicon.updateEntry({
        guid: entry.guid,
        lexemeForm: updatedEntry.lexemeForm,
        citationForm: updatedEntry.citationForm,
        senses: updatedEntry.senses,
        etymology: updatedEntry.etymology
      })

      setHasChanges(false)
      message.success('Entry saved successfully')
    } catch (error: any) {
      console.error('Error saving entry:', error)
      message.error(`Error saving entry: ${error.message}`)
    }
  }

  const handleAddSense = () => {
    const newSense: LexSense = {
      guid: crypto.randomUUID(),
      class: 'LexSense',
      definition: { en: '' },
      gloss: { en: '' },
      dateCreated: new Date(),
      dateModified: new Date()
    }

    const updatedEntry: LexEntry = {
      ...entry,
      senses: [...entry.senses, newSense]
    }

    setEntry(updatedEntry)
    setHasChanges(true)
  }

  const handleUpdateSense = (index: number, field: 'definition' | 'gloss', value: string) => {
    const updatedSenses = [...entry.senses]
    updatedSenses[index] = {
      ...updatedSenses[index],
      [field]: { en: value }
    }

    const updatedEntry: LexEntry = {
      ...entry,
      senses: updatedSenses
    }

    setEntry(updatedEntry)
    setHasChanges(true)
  }

  const handleDeleteSense = (index: number) => {
    const updatedSenses = entry.senses.filter((_, i) => i !== index)

    const updatedEntry: LexEntry = {
      ...entry,
      senses: updatedSenses
    }

    setEntry(updatedEntry)
    setHasChanges(true)
  }

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '24px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0 }}>Edit Entry</h2>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            disabled={!hasChanges}
          >
            Save
          </Button>
        </div>

        <Form
          form={form}
          layout="vertical"
          onValuesChange={() => setHasChanges(true)}
        >
          <Card title="Lexeme Form" size="small" style={{ marginBottom: '16px' }}>
            <Form.Item
              name="lexemeForm"
              label="Lexeme Form"
              rules={[{ required: true, message: 'Lexeme form is required' }]}
            >
              <Input size="large" placeholder="Enter lexeme form" />
            </Form.Item>

            <Form.Item name="citationForm" label="Citation Form">
              <Input placeholder="Enter citation form (optional)" />
            </Form.Item>

            <Form.Item name="homographNumber" label="Homograph Number">
              <Input type="number" placeholder="e.g., 1, 2, 3" />
            </Form.Item>
          </Card>

          <Card title="Etymology" size="small" style={{ marginBottom: '16px' }}>
            <Form.Item name="etymology" label="Etymology">
              <TextArea rows={2} placeholder="Enter etymology information" />
            </Form.Item>
          </Card>
        </Form>

        <Card
          title={`Senses (${entry.senses.length})`}
          size="small"
          extra={
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={handleAddSense}
            >
              Add Sense
            </Button>
          }
        >
          {entry.senses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#999' }}>
              No senses yet. Click "Add Sense" to create one.
            </div>
          ) : (
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {entry.senses.map((sense, index) => (
                <Card
                  key={sense.guid}
                  type="inner"
                  title={`Sense ${index + 1}`}
                  size="small"
                  extra={
                    <Button
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteSense(index)}
                    >
                      Delete
                    </Button>
                  }
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                        Gloss
                      </label>
                      <Input
                        value={sense.gloss?.en || ''}
                        onChange={(e) => handleUpdateSense(index, 'gloss', e.target.value)}
                        placeholder="Enter gloss"
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                        Definition
                      </label>
                      <TextArea
                        value={sense.definition?.en || ''}
                        onChange={(e) => handleUpdateSense(index, 'definition', e.target.value)}
                        rows={3}
                        placeholder="Enter definition"
                      />
                    </div>
                  </Space>
                </Card>
              ))}
            </Space>
          )}
        </Card>

        <Divider />

        <div style={{ fontSize: '12px', color: '#999', textAlign: 'center' }}>
          <div>Created: {entry.dateCreated.toLocaleString()}</div>
          <div>Modified: {entry.dateModified.toLocaleString()}</div>
          <div>GUID: {entry.guid}</div>
        </div>
      </div>
    </div>
  )
}
