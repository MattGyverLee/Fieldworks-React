import React, { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useAtomValue, useSetAtom } from 'jotai'
import { sortedEntriesAtom, currentEntryGuidAtom, selectedEntriesAtom, toggleSelectEntryAtom } from '../../../stores/lexiconAtoms'
import { Checkbox } from 'antd'
import type { LexEntry } from '@shared/types'

export const EntryList: React.FC = () => {
  const entries = useAtomValue(sortedEntriesAtom)
  const selectedEntries = useAtomValue(selectedEntriesAtom)
  const setCurrentEntryGuid = useSetAtom(currentEntryGuidAtom)
  const toggleSelect = useSetAtom(toggleSelectEntryAtom)

  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 10
  })

  const handleEntryClick = (entry: LexEntry) => {
    setCurrentEntryGuid(entry.guid)
  }

  const handleCheckboxClick = (e: React.MouseEvent, guid: string) => {
    e.stopPropagation()
    toggleSelect(guid)
  }

  return (
    <div
      ref={parentRef}
      style={{
        height: '100%',
        overflow: 'auto',
        contain: 'strict'
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative'
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const entry = entries[virtualRow.index]

          return (
            <div
              key={entry.guid}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`
              }}
            >
              <EntryRow
                entry={entry}
                isSelected={selectedEntries.has(entry.guid)}
                onClick={() => handleEntryClick(entry)}
                onCheckboxClick={(e) => handleCheckboxClick(e, entry.guid)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface EntryRowProps {
  entry: LexEntry
  isSelected: boolean
  onClick: () => void
  onCheckboxClick: (e: React.MouseEvent) => void
}

const EntryRow: React.FC<EntryRowProps> = React.memo(({ entry, isSelected, onClick, onCheckboxClick }) => {
  const firstSense = entry.senses[0]
  const definition = firstSense?.definition?.en || firstSense?.definition[Object.keys(firstSense?.definition || {})[0]] || ''
  const gloss = firstSense?.gloss?.en || firstSense?.gloss[Object.keys(firstSense?.gloss || {})[0]] || ''

  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 16px',
        borderBottom: '1px solid #f0f0f0',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        background: isSelected ? '#e6f7ff' : 'transparent'
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = '#fafafa'
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = 'transparent'
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <div onClick={onCheckboxClick} style={{ paddingTop: '2px' }}>
          <Checkbox checked={isSelected} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
            {entry.lexemeForm}
            {entry.homographNumber && (
              <span style={{ fontSize: '11px', verticalAlign: 'super', marginLeft: '2px' }}>
                {entry.homographNumber}
              </span>
            )}
          </div>
          {gloss && (
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '2px' }}>
              {gloss}
            </div>
          )}
          {definition && (
            <div
              style={{
                fontSize: '12px',
                color: '#999',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {definition}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}, (prev, next) =>
  prev.entry.guid === next.entry.guid &&
  prev.isSelected === next.isSelected
)

EntryRow.displayName = 'EntryRow'
