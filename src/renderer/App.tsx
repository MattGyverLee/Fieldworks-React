import React, { useEffect } from 'react'
import { ConfigProvider, Layout, Menu, theme } from 'antd'
import {
  BookOutlined,
  FileTextOutlined,
  ToolOutlined,
  FolderOpenOutlined,
  SearchOutlined,
  SaveOutlined,
  DownloadOutlined
} from '@ant-design/icons'
import { useAppStore } from './stores/appStore'
import { LexiconView } from './features/lexicon/LexiconView'
import { TextsView } from './features/texts/TextsView'
import { ConcordanceView } from './features/concordance/ConcordanceView'
import { ExportView } from './features/export/ExportView'
import { GrammarView } from './features/grammar/GrammarView'
import './styles/global.css'

const { Header, Sider, Content } = Layout

export const App: React.FC = () => {
  const { currentView, isSidebarOpen, theme: appTheme, projectPath, setCurrentView, setSidebarOpen, setLoading, setProjectPath } = useAppStore()

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
      key: 'concordance',
      icon: <SearchOutlined />,
      label: 'Concordance'
    },
    {
      key: 'export',
      icon: <DownloadOutlined />,
      label: 'Export'
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
        setProjectPath(filePath)
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

  const handleSaveProject = async () => {
    if (!projectPath) {
      await handleSaveAsProject()
      return
    }

    try {
      setLoading(true, 'Saving project...')

      const result = await window.api.project.save(projectPath, 'project-guid')

      if (result.success) {
        console.log('Project saved successfully')
        alert('Project saved successfully')
      } else {
        console.error('Failed to save project:', result.error)
        alert(`Failed to save project: ${result.error}`)
      }

      setLoading(false)
    } catch (error: any) {
      console.error('Error saving project:', error)
      alert(`Error saving project: ${error.message}`)
      setLoading(false)
    }
  }

  const handleSaveAsProject = async () => {
    try {
      setLoading(true, 'Saving project as...')

      const filePath = await window.api.dialog.saveFile()
      if (!filePath) {
        setLoading(false)
        return
      }

      const result = await window.api.project.save(filePath, 'project-guid')

      if (result.success) {
        console.log('Project saved successfully')
        setProjectPath(filePath)
        alert('Project saved successfully')
      } else {
        console.error('Failed to save project:', result.error)
        alert(`Failed to save project: ${result.error}`)
      }

      setLoading(false)
    } catch (error: any) {
      console.error('Error saving project:', error)
      alert(`Error saving project: ${error.message}`)
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
        <Header style={{ display: 'flex', alignItems: 'center', padding: '0 16px', gap: '8px' }}>
          <div style={{ color: 'white', fontSize: '18px', fontWeight: 'bold', marginRight: '24px' }}>
            FieldWorks
          </div>
          {projectPath && (
            <div style={{ color: '#ddd', fontSize: '12px' }}>
              {projectPath.split('/').pop()}
            </div>
          )}
          <div style={{ flex: 1 }} />
          <button
            onClick={handleOpenProject}
            style={{
              background: '#1890ff',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '8px'
            }}
          >
            <FolderOpenOutlined /> Open
          </button>
          {projectPath && (
            <>
              <button
                onClick={handleSaveProject}
                style={{
                  background: '#52c41a',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginRight: '8px'
                }}
              >
                <SaveOutlined /> Save
              </button>
              <button
                onClick={handleSaveAsProject}
                style={{
                  background: '#13c2c2',
                  color: 'white',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Save As...
              </button>
            </>
          )}
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
              {currentView === 'concordance' && <ConcordanceView />}
              {currentView === 'export' && <ExportView />}
              {currentView === 'grammar' && <GrammarView />}
            </Content>
          </Layout>
        </Layout>
      </Layout>
    </ConfigProvider>
  )
}
