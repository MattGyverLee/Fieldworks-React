import React, { useEffect, useState } from 'react'
import {  Layout, Button, List, Modal, Form, Input, Select, Empty, message, Spin } from 'antd'
import { PlusOutlined, FileTextOutlined, DeleteOutlined } from '@ant-design/icons'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import {
  sortedTextsAtom,
  currentTextGuidAtom,
  isLoadingTextsAtom,
  loadTextsAtom,
  createTextAtom,
  deleteTextAtom
} from '../../stores/textsAtoms'
import { TextEditor } from './components/TextEditor'

const { Sider, Content } = Layout

export const TextsView: React.FC = () => {
  const texts = useAtomValue(sortedTextsAtom)
  const [currentTextGuid, setCurrentTextGuid] = useAtom(currentTextGuidAtom)
  const isLoading = useAtomValue(isLoadingTextsAtom)
  const loadTexts = useSetAtom(loadTextsAtom)
  const createText = useSetAtom(createTextAtom)
  const deleteText = useSetAtom(deleteTextAtom)

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    loadTexts()
  }, [loadTexts])

  const handleCreateText = async (values: any) => {
    try {
      const newText = await createText({
        title: { en: values.title },
        genre: values.genre
      })
      setCurrentTextGuid(newText.guid)
      setIsCreateModalOpen(false)
      form.resetFields()
      message.success('Text created successfully')
    } catch (error) {
      message.error('Failed to create text')
      console.error(error)
    }
  }

  const handleDeleteText = async (guid: string, title: string) => {
    Modal.confirm({
      title: 'Delete Text',
      content: `Are you sure you want to delete "${title}"? This will delete all paragraphs and cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await deleteText(guid)
          message.success('Text deleted successfully')
        } catch (error) {
          message.error('Failed to delete text')
          console.error(error)
        }
      }
    })
  }

  const currentText = texts.find(t => t.guid === currentTextGuid)

  return (
    <Layout style={{ height: '100%' }}>
      <Sider width={300} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            block
            onClick={() => setIsCreateModalOpen(true)}
          >
            New Text
          </Button>
        </div>

        {isLoading ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <Spin />
          </div>
        ) : texts.length === 0 ? (
          <Empty
            image={<FileTextOutlined style={{ fontSize: '48px', color: '#ccc' }} />}
            description="No texts yet"
            style={{ marginTop: '48px' }}
          >
            <Button type="primary" onClick={() => setIsCreateModalOpen(true)}>
              Create First Text
            </Button>
          </Empty>
        ) : (
          <List
            dataSource={texts}
            style={{ height: 'calc(100vh - 120px)', overflow: 'auto' }}
            renderItem={(text) => (
              <List.Item
                key={text.guid}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  backgroundColor: currentTextGuid === text.guid ? '#e6f7ff' : 'transparent',
                  borderLeft: currentTextGuid === text.guid ? '3px solid #1890ff' : '3px solid transparent'
                }}
                onClick={() => setCurrentTextGuid(text.guid)}
                actions={[
                  <Button
                    key="delete"
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteText(text.guid, Object.values(text.title)[0] || 'Untitled')
                    }}
                  />
                ]}
              >
                <List.Item.Meta
                  title={Object.values(text.title)[0] || 'Untitled'}
                  description={text.genre || 'No genre'}
                />
              </List.Item>
            )}
          />
        )}
      </Sider>

      <Content style={{ padding: '24px', background: '#fff' }}>
        {currentText ? (
          <TextEditor text={currentText} />
        ) : (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              color: '#999'
            }}
          >
            <FileTextOutlined style={{ fontSize: '64px', marginBottom: '16px' }} />
            <div>Select a text to edit or create a new one</div>
          </div>
        )}
      </Content>

      <Modal
        title="Create New Text"
        open={isCreateModalOpen}
        onCancel={() => {
          setIsCreateModalOpen(false)
          form.resetFields()
        }}
        onOk={() => form.submit()}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateText}
        >
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: 'Please enter a title' }]}
          >
            <Input placeholder="Enter text title" />
          </Form.Item>

          <Form.Item
            name="genre"
            label="Genre"
          >
            <Select
              placeholder="Select genre"
              allowClear
              options={[
                { label: 'Narrative', value: 'Narrative' },
                { label: 'Procedural', value: 'Procedural' },
                { label: 'Expository', value: 'Expository' },
                { label: 'Hortatory', value: 'Hortatory' },
                { label: 'Song', value: 'Song' },
                { label: 'Drama', value: 'Drama' }
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  )
}
