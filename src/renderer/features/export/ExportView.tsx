import React, { useState } from 'react'
import { Card, Button, Space, Typography, message, Radio, Divider } from 'antd'
import { DownloadOutlined, FileExcelOutlined, FileWordOutlined, FilePdfOutlined } from '@ant-design/icons'

const { Title, Paragraph } = Typography

export const ExportView: React.FC = () => {
  const [exporting, setExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'docx' | 'pdf'>('csv')

  const handleExport = async () => {
    setExporting(true)
    try {
      message.info('Preparing export...')

      // Get all entries
      const entries = await window.api.export.getEntries()

      if (entries.length === 0) {
        message.warning('No entries to export')
        setExporting(false)
        return
      }

      message.success(`Retrieved ${entries.length} entries`)

      if (exportFormat === 'csv') {
        await exportToCSV(entries)
      } else if (exportFormat === 'excel') {
        message.info('Excel export coming soon')
      } else if (exportFormat === 'docx') {
        message.info('Word export coming soon')
      } else if (exportFormat === 'pdf') {
        message.info('PDF export coming soon')
      }

    } catch (error) {
      console.error('Export error:', error)
      message.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  const exportToCSV = async (entries: any[]) => {
    try {
      // Build CSV content
      const headers = ['Lexeme Form', 'Citation Form', 'Homograph', 'Definition', 'Gloss', 'Examples', 'Etymology', 'Date Created']
      const rows: string[][] = [headers]

      entries.forEach(entry => {
        const senses = entry.senses || []
        if (senses.length === 0) {
          // Entry with no senses
          rows.push([
            csvEscape(entry.lexemeForm || ''),
            csvEscape(entry.citationForm || ''),
            entry.homographNumber?.toString() || '',
            '',
            '',
            '',
            csvEscape(entry.etymology || ''),
            entry.dateCreated?.toISOString() || ''
          ])
        } else {
          // One row per sense
          senses.forEach((sense: any) => {
            const definition = Object.values(sense.definition || {}).join('; ')
            const gloss = Object.values(sense.gloss || {}).join('; ')
            const examples = (sense.examples || []).map((ex: any) =>
              Object.values(ex.example || {}).join('; ')
            ).join(' | ')

            rows.push([
              csvEscape(entry.lexemeForm || ''),
              csvEscape(entry.citationForm || ''),
              entry.homographNumber?.toString() || '',
              csvEscape(definition),
              csvEscape(gloss),
              csvEscape(examples),
              csvEscape(entry.etymology || ''),
              entry.dateCreated?.toISOString() || ''
            ])
          })
        }
      })

      const csvContent = rows.map(row => row.join(',')).join('\n')

      // Trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `fieldworks-export-${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(url)

      message.success(`Exported ${entries.length} entries to CSV`)
    } catch (error) {
      console.error('CSV export error:', error)
      message.error('CSV export failed')
      throw error
    }
  }

  const csvEscape = (str: string): string => {
    if (!str) return ''
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Title level={2}>
              <DownloadOutlined /> Export Data
            </Title>
            <Paragraph type="secondary">
              Export your lexicon data to various formats for use in other applications.
            </Paragraph>
          </div>

          <Divider />

          <div>
            <Title level={4}>Select Export Format</Title>
            <Radio.Group
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              size="large"
            >
              <Space direction="vertical" size="middle">
                <Radio value="csv">
                  <Space>
                    <FileExcelOutlined style={{ fontSize: '18px', color: '#52c41a' }} />
                    <div>
                      <div style={{ fontWeight: 'bold' }}>CSV (Comma Separated Values)</div>
                      <div style={{ fontSize: '12px', color: '#999' }}>
                        Open in Excel, Google Sheets, or any spreadsheet application
                      </div>
                    </div>
                  </Space>
                </Radio>

                <Radio value="excel" disabled>
                  <Space>
                    <FileExcelOutlined style={{ fontSize: '18px', color: '#1890ff' }} />
                    <div>
                      <div style={{ fontWeight: 'bold' }}>Excel (.xlsx) - Coming Soon</div>
                      <div style={{ fontSize: '12px', color: '#999' }}>
                        Native Excel format with formatting and multiple sheets
                      </div>
                    </div>
                  </Space>
                </Radio>

                <Radio value="docx" disabled>
                  <Space>
                    <FileWordOutlined style={{ fontSize: '18px', color: '#1890ff' }} />
                    <div>
                      <div style={{ fontWeight: 'bold' }}>Word Document (.docx) - Coming Soon</div>
                      <div style={{ fontSize: '12px', color: '#999' }}>
                        Formatted dictionary for Microsoft Word
                      </div>
                    </div>
                  </Space>
                </Radio>

                <Radio value="pdf" disabled>
                  <Space>
                    <FilePdfOutlined style={{ fontSize: '18px', color: '#f5222d' }} />
                    <div>
                      <div style={{ fontWeight: 'bold' }}>PDF - Coming Soon</div>
                      <div style={{ fontSize: '12px', color: '#999' }}>
                        Print-ready dictionary document
                      </div>
                    </div>
                  </Space>
                </Radio>
              </Space>
            </Radio.Group>
          </div>

          <Divider />

          <div>
            <Button
              type="primary"
              size="large"
              icon={<DownloadOutlined />}
              onClick={handleExport}
              loading={exporting}
              block
            >
              {exporting ? 'Exporting...' : 'Export Now'}
            </Button>
          </div>

          <Card size="small" style={{ background: '#fafafa' }}>
            <Title level={5}>Export Information</Title>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>CSV exports include: Lexeme form, citation form, definitions, glosses, examples, etymology</li>
              <li>Each sense is exported as a separate row</li>
              <li>Multi-language strings are combined with semicolons</li>
              <li>Data is UTF-8 encoded for international character support</li>
            </ul>
          </Card>
        </Space>
      </Card>
    </div>
  )
}
