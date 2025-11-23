import React, { useEffect } from 'react'
import { Layout, Input, Button, Space, Spin } from 'antd'
import { SearchOutlined, PlusOutlined, SaveOutlined, BookOutlined } from '@ant-design/icons'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import {
  entriesAtom,
  searchQueryAtom,
  searchResultsAtom,
  filterTextAtom,
  currentEntryGuidAtom,
  isLoadingEntriesAtom
} from '../../stores/lexiconAtoms'
import { EntryList } from './components/EntryList'
import { EntryEditor } from './components/EntryEditor'
import type { LexEntry } from '@shared/types'

const { Sider, Content } = Layout
const { Search } = Input

export const LexiconView: React.FC = () => {
  const [entries, setEntries] = useAtom(entriesAtom)
  const [isLoading, setIsLoading] = useAtom(isLoadingEntriesAtom)
  const [searchQuery, setSearchQuery] = useAtom(searchQueryAtom)
  const setSearchResults = useSetAtom(searchResultsAtom)
  const setFilterText = useSetAtom(filterTextAtom)
  const currentEntryGuid = useAtomValue(currentEntryGuidAtom)

  useEffect(() => {
    loadEntries()
  }, [])

  const loadEntries = async () => {
    try {
      setIsLoading(true)
      const loadedEntries = await window.api.lexicon.getEntries(10000, 0)

      const entriesMap = new Map<string, LexEntry>()
      loadedEntries.forEach((entry) => {
        entriesMap.set(entry.guid, entry)
      })

      setEntries(entriesMap)
      setIsLoading(false)
    } catch (error) {
      console.error('Error loading entries:', error)
      setIsLoading(false)
    }
  }

  const handleSearch = async (value: string) => {
    setSearchQuery(value)

    if (!value.trim()) {
      setSearchResults([])
      return
    }

    try {
      const results = await window.api.search.entries({ query: value, limit: 100 })
      setSearchResults(results)
    } catch (error) {
      console.error('Error searching:', error)
    }
  }

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterText(e.target.value)
  }

  const handleNewEntry = async () => {
    try {
      const newEntry = await window.api.lexicon.createEntry({
        lexemeForm: 'New Entry',
        writingSystem: 'en'
      })

      const newEntries = new Map(entries)
      newEntries.set(newEntry.guid, newEntry)
      setEntries(newEntries)
    } catch (error) {
      console.error('Error creating entry:', error)
    }
  }

  const handleSave = async () => {
    try {
      // TODO: Implement project save
      console.log('Saving project...')
    } catch (error) {
      console.error('Error saving:', error)
    }
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin size="large" tip="Loading entries..." />
      </div>
    )
  }

  return (
    <Layout style={{ height: '100%' }}>
      <Sider width={400} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Search
              placeholder="Search entries (FTS5)"
              allowClear
              enterButton={<SearchOutlined />}
              size="middle"
              onSearch={handleSearch}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <Input
              placeholder="Filter by lexeme..."
              allowClear
              onChange={handleFilterChange}
              prefix={<SearchOutlined />}
            />

            <Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleNewEntry}>
                New Entry
              </Button>
              <Button icon={<SaveOutlined />} onClick={handleSave}>
                Save
              </Button>
            </Space>

            <div style={{ fontSize: '12px', color: '#888' }}>
              {entries.size} entries
            </div>
          </Space>
        </div>

        <div style={{ height: 'calc(100% - 200px)', overflow: 'hidden' }}>
          <EntryList />
        </div>
      </Sider>

      <Content style={{ padding: '0', background: '#fff' }}>
        {currentEntryGuid ? (
          <EntryEditor key={currentEntryGuid} entryGuid={currentEntryGuid} />
        ) : (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#999'
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <BookOutlined style={{ fontSize: '64px', marginBottom: '16px' }} />
              <div>Select an entry to edit</div>
            </div>
          </div>
        )}
      </Content>
    </Layout>
  )
}
