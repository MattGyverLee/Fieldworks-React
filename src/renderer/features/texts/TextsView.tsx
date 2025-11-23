import React from 'react'
import { Button, Space, Empty } from 'antd'
import { PlusOutlined, FileTextOutlined } from '@ant-design/icons'

export const TextsView: React.FC = () => {
  return (
    <div style={{ height: '100%', padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />}>
            New Text
          </Button>
          <Button>Import SFM</Button>
        </Space>
      </div>

      <Empty
        image={<FileTextOutlined style={{ fontSize: '64px', color: '#ccc' }} />}
        description="No texts yet"
      >
        <p>Create a new text or import from SFM format</p>
        <p style={{ fontSize: '12px', color: '#999' }}>
          Phase 3: Text corpus management, interlinear analysis, and concordance views
        </p>
      </Empty>
    </div>
  )
}
