import React, { useEffect } from 'react'
import { ConfigProvider, Layout, Menu, theme } from 'antd'
import {
  BookOutlined,
  FileTextOutlined,
  ToolOutlined,
  FolderOpenOutlined
} from '@ant-design/icons'
import { useAppStore } from './stores/appStore'
import { LexiconView } from './features/lexicon/LexiconView'
import { TextsView } from './features/texts/TextsView'
import './styles/global.css'

const { Header, Sider, Content } = Layout

export const App: React.FC = () => {
  const { currentView, isSidebarOpen, theme: appTheme, setCurrentView, setSidebarOpen, setLoading } = useAppStore()

  const menuItems = [
    {
      key: 'lexicon',
      icon: <BookOutlined />,
      label: 'Lexicon'
    },
    {
      key: 'texts',
      icon: <FileTextOutlined />,
      label: 'Texts & Words'
    },
    {
      key: 'grammar',
      icon: <ToolOutlined />,
      label: 'Grammar'
    }
  ]

  useEffect(() => {
    // Load initial data or show welcome screen
    console.log('Fieldworks React initialized')
  }, [])

  const handleOpenProject = async () => {
    try {
      setLoading(true, 'Opening project...')

      const filePath = await window.api.dialog.openFile()
      if (!filePath) {
        setLoading(false)
        return
      }

      const result = await window.api.project.open(filePath)

      if (result.success) {
        console.log('Project opened successfully')
        // Reload entries after opening project
        window.location.reload()
      } else {
        console.error('Failed to open project:', result.error)
        alert(`Failed to open project: ${result.error}`)
      }

      setLoading(false)
    } catch (error: any) {
      console.error('Error opening project:', error)
      alert(`Error opening project: ${error.message}`)
      setLoading(false)
    }
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: appTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm
      }}
    >
      <Layout style={{ height: '100vh' }}>
        <Header style={{ display: 'flex', alignItems: 'center', padding: '0 16px' }}>
          <div style={{ color: 'white', fontSize: '18px', fontWeight: 'bold', marginRight: '24px' }}>
            FieldWorks
          </div>
          <div style={{ flex: 1 }} />
          <button
            onClick={handleOpenProject}
            style={{
              background: '#1890ff',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            <FolderOpenOutlined /> Open Project
          </button>
        </Header>
        <Layout>
          <Sider
            collapsible
            collapsed={!isSidebarOpen}
            onCollapse={setSidebarOpen}
            width={200}
            theme="light"
          >
            <Menu
              mode="inline"
              selectedKeys={[currentView]}
              items={menuItems}
              onClick={({ key }) => setCurrentView(key as any)}
              style={{ height: '100%', borderRight: 0 }}
            />
          </Sider>
          <Layout style={{ padding: '0' }}>
            <Content
              style={{
                padding: 0,
                margin: 0,
                minHeight: 280,
                background: '#fff',
                overflow: 'hidden'
              }}
            >
              {currentView === 'lexicon' && <LexiconView />}
              {currentView === 'texts' && <TextsView />}
              {currentView === 'grammar' && (
                <div style={{ padding: '24px' }}>
                  <h2>Grammar View</h2>
                  <p>Coming in Phase 6</p>
                </div>
              )}
              {currentView === 'notebook' && (
                <div style={{ padding: '24px' }}>
                  <h2>Notebook View</h2>
                  <p>Future feature</p>
                </div>
              )}
            </Content>
          </Layout>
        </Layout>
      </Layout>
    </ConfigProvider>
  )
}
