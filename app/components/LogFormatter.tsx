'use client'

import { useState, useMemo, useEffect, useRef } from 'react'

interface LogLine {
  timestamp?: string
  content: string
  type: 'group-start' | 'group-end' | 'command' | 'error' | 'warning' | 'regular'
  groupName?: string
  level: number
}

interface LogGroup {
  name: string
  lines: LogLine[]
  level: number
  expanded: boolean
}

interface LogFormatterProps {
  logs: string
  searchTerm?: string
  focusLine?: number
}

// ANSI color code mapping to Tailwind CSS classes
const ANSI_COLORS: { [key: string]: string } = {
  '30': 'text-black',      // black
  '31': 'text-red-400',    // red
  '32': 'text-green-400',  // green
  '33': 'text-yellow-400', // yellow
  '34': 'text-blue-400',   // blue
  '35': 'text-purple-400', // magenta
  '36': 'text-cyan-400',   // cyan
  '37': 'text-white',      // white
  '90': 'text-gray-600',   // bright black
  '91': 'text-red-300',    // bright red
  '92': 'text-green-300',  // bright green
  '93': 'text-yellow-300', // bright yellow
  '94': 'text-blue-300',   // bright blue
  '95': 'text-purple-300', // bright magenta
  '96': 'text-cyan-300',   // bright cyan
  '97': 'text-gray-100',   // bright white
}

function parseAnsiContent(content: string): React.ReactNode[] {
  if (!content.includes('\x1b[') && !content.includes('[')) return [content]
  
  const parts: React.ReactNode[] = []
  let currentIndex = 0
  let currentClasses: string[] = []
  
  // Match both \x1b[...m and [...m patterns
  const ansiRegex = /(?:\x1b\[|\[)([0-9;]+)m/g
  let match
  
  while ((match = ansiRegex.exec(content)) !== null) {
    // Add text before the ANSI code
    if (match.index > currentIndex) {
      const text = content.slice(currentIndex, match.index)
      if (text) {
        parts.push(
          currentClasses.length > 0 
            ? <span key={parts.length} className={currentClasses.join(' ')}>{text}</span>
            : text
        )
      }
    }
    
    // Process ANSI codes
    const codes = match[1].split(';')
    codes.forEach(code => {
      if (code === '0') {
        currentClasses = [] // Reset
      } else if (code === '1') {
        if (!currentClasses.includes('font-bold')) currentClasses.push('font-bold')
      } else if (ANSI_COLORS[code]) {
        currentClasses = currentClasses.filter(cls => !cls.startsWith('text-'))
        currentClasses.push(ANSI_COLORS[code])
      }
    })
    
    currentIndex = ansiRegex.lastIndex
  }
  
  // Add remaining text
  if (currentIndex < content.length) {
    const text = content.slice(currentIndex)
    if (text) {
      parts.push(
        currentClasses.length > 0 
          ? <span key={parts.length} className={currentClasses.join(' ')}>{text}</span>
          : text
      )
    }
  }
  
  return parts.length > 0 ? parts : [content]
}

// Combined function to handle both ANSI colors and search highlighting
function processContent(text: string, searchTerm?: string): React.ReactNode {
  // First parse ANSI colors
  const coloredParts = parseAnsiContent(text)
  
  // Then apply search highlighting if needed
  if (!searchTerm) return coloredParts
  
  try {
    const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`(${escaped})`, 'ig')
    
    return coloredParts.map((part, partIndex) => {
      if (typeof part === 'string') {
        return part.split(re).map((chunk, i) => 
          re.test(chunk) 
            ? <mark key={`${partIndex}-${i}`} className="bg-yellow-600/60 text-yellow-100 px-0.5 rounded">{chunk}</mark> 
            : chunk
        )
      }
      return part // Keep React elements as-is
    })
  } catch {
    return coloredParts
  }
}

function classifyLine(line: string, currentLevel: number): { line: LogLine | null; level: number } {
  if (!line.trim()) return { line: null, level: currentLevel }
  const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)\s(.*)/)
  const timestamp = timestampMatch ? timestampMatch[1] : undefined
  const content = timestampMatch ? timestampMatch[2] : line
  if (content.startsWith('##[group]')) {
    const groupName = content.replace('##[group]', '').trim()
    return { line: { timestamp, content: groupName, type: 'group-start', groupName, level: currentLevel }, level: currentLevel + 1 }
  }
  if (content.startsWith('##[endgroup]')) {
    const newLevel = Math.max(0, currentLevel - 1)
    return { line: { timestamp, content: '', type: 'group-end', level: newLevel }, level: newLevel }
  }
  if (content.startsWith('##[command]') || content.startsWith('##[section]')) {
    return { line: { timestamp, content, type: 'command', level: currentLevel }, level: currentLevel }
  }
  const lower = content.toLowerCase()
  if (lower.includes('error') || content.includes('❌') || lower.includes('failed')) {
    return { line: { timestamp, content, type: 'error', level: currentLevel }, level: currentLevel }
  }
  if (lower.includes('warning') || content.includes('⚠️') || lower.includes('warn')) {
    return { line: { timestamp, content, type: 'warning', level: currentLevel }, level: currentLevel }
  }
  return { line: { timestamp, content, type: 'regular', level: currentLevel }, level: currentLevel }
}

export default function LogFormatter({ logs, searchTerm, focusLine }: LogFormatterProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set())
  const LINE_LIMIT = 1500
  const HEAD_COUNT = 1000
  const TAIL_COUNT = 300

  const toggleGroup = (groupIndex: number) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupIndex)) {
        newSet.delete(groupIndex)
      } else {
        newSet.add(groupIndex)
      }
      return newSet
    })
  }

  const parsedLogs = useMemo(() => {
    if (!logs) return []
    const lines = logs.split('\n')
    const parsed: LogLine[] = []
    let currentLevel = 0
    for (const raw of lines) {
      const { line, level } = classifyLine(raw, currentLevel)
      currentLevel = level
      if (line) parsed.push(line)
    }
    return parsed
  }, [logs])

  const groupedLogs = useMemo(() => {
    const groups: LogGroup[] = []
    let currentGroup: LogGroup | null = null

    for (const line of parsedLogs) {
      if (line.type === 'group-start') {
        // Close previous group if exists
        if (currentGroup) {
          groups.push(currentGroup)
        }
        
        // Start new group
        currentGroup = {
          name: line.groupName || 'Unknown Group',
          lines: [],
          level: line.level,
          expanded: false // We'll handle expansion in the render
        }
      } else if (line.type === 'group-end') {
        // End current group
        if (currentGroup) {
          groups.push(currentGroup)
          currentGroup = null
        }
      } else {
        // Add line to current group or as standalone
        if (currentGroup) {
          currentGroup.lines.push(line)
        } else {
          // Standalone line (not in a group)
          groups.push({
            name: '',
            lines: [line],
            level: line.level,
            expanded: true
          })
        }
      }
    }

    // Close any remaining group
    if (currentGroup) {
      groups.push(currentGroup)
    }

    return groups
  }, [parsedLogs])

  // Flatten grouped logs into a sequential array of render items with global index for simple truncation
  const flatLines = useMemo(() => {
    const items: { line?: LogLine; group?: LogGroup; groupIndex?: number; globalIndex: number }[] = []
    let idx = 0
    groupedLogs.forEach((g, groupIndex) => {
      if (g.name) {
        // Add the group header as a clickable item
        items.push({ group: g, groupIndex, globalIndex: idx++ })
        // Add group lines only if expanded
        if (expandedGroups.has(groupIndex)) {
          g.lines.forEach(l => { items.push({ line: l, globalIndex: idx++ }) })
        }
      } else {
        // Standalone lines (not in a group)
        g.lines.forEach(l => { items.push({ line: l, globalIndex: idx++ }) })
      }
    })
    return items
  }, [groupedLogs, expandedGroups])

  // Auto expand if focusLine is outside truncated window
  useEffect(() => {
    if (focusLine != null && !showAll && flatLines.length > LINE_LIMIT) {
      if (focusLine > HEAD_COUNT && focusLine < flatLines.length - TAIL_COUNT) {
        setShowAll(true)
      }
    }
  }, [focusLine, showAll, flatLines.length])

  const truncatedInfo = useMemo(() => {
    if (showAll || flatLines.length <= LINE_LIMIT) return null
    const head = flatLines.slice(0, HEAD_COUNT)
    const tail = flatLines.slice(-TAIL_COUNT)
    const omitted = flatLines.length - head.length - tail.length
    return { head, tail, omitted }
  }, [flatLines, showAll])

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return ''
    try {
      const date = new Date(timestamp)
      // Show more precision: HH:MM:SS.mmm to better show sequence
      const timeStr = date.toISOString().substring(11, 23) // Extract HH:MM:SS.sssZ
      return timeStr.replace('Z', '') // Remove the Z suffix
    } catch {
      // If timestamp parsing fails, return empty string for consistent spacing
      return ''
    }
  }

  const getLineTypeClass = (type: LogLine['type']) => {
    switch (type) {
      case 'error':
        return 'text-red-400'
      case 'warning':
        return 'text-yellow-400'
      case 'command':
        return 'text-blue-400 font-medium'
      case 'group-start':
        return 'text-purple-400 font-medium'
      default:
        return 'text-gray-300'
    }
  }

  const highlight = (text: string) => {
    return processContent(text, searchTerm)
  }

  useEffect(() => {
    if (focusLine == null || !containerRef.current) return
    const el = containerRef.current.querySelector(`[data-log-line="${focusLine}"]`)
    if (el) {
      ;(el as HTMLElement).scrollIntoView({ block: 'center' })
      ;(el as HTMLElement).classList.add('bg-blue-600/20')
      setTimeout(() => (el as HTMLElement).classList.remove('bg-blue-600/20'), 2000)
    }
  }, [focusLine, logs])

  if (!logs || logs.trim() === '') {
    return <div className="text-gray-400">No logs available</div>
  }

  const renderLine = (entry: { line: LogLine; globalIndex: number }) => (
    <div
      key={entry.globalIndex}
      className="flex py-0.5 items-start font-mono text-xs leading-relaxed"
      data-log-line={entry.globalIndex}
    >
      <div className="w-[140px] flex-shrink-0 text-left text-gray-500 mr-3 tabular-nums">
        {entry.line.timestamp ? formatTimestamp(entry.line.timestamp) : ''}
      </div>
      <div 
        className={`${getLineTypeClass(entry.line.type)} flex-1 break-words whitespace-pre-wrap`}
        style={{ paddingLeft: `${entry.line.level * 16}px` }}
      >
        {highlight(entry.line.content)}
      </div>
    </div>
  )

  const renderGroupHeader = (group: LogGroup, groupIndex: number, globalIndex: number) => {
    const isExpanded = expandedGroups.has(groupIndex)
    return (
      <div
        key={globalIndex}
        className="flex py-0.5 items-start font-mono text-xs leading-relaxed cursor-pointer hover:bg-gray-800/50"
        data-log-line={globalIndex}
        onClick={() => toggleGroup(groupIndex)}
      >
        <div className="w-[140px] flex-shrink-0 text-left text-gray-500 mr-3 tabular-nums">
          {/* Groups typically don't have individual timestamps */}
        </div>
        <div 
          className="flex-1 break-words whitespace-pre-wrap text-purple-400 font-medium flex items-center"
          style={{ paddingLeft: `${group.level * 16}px` }}
        >
          <span className="mr-2 select-none">
            {isExpanded ? '▼' : '▶'}
          </span>
          <span>{group.name}</span>
          <span className="ml-2 text-gray-500 text-xs">
            ({group.lines.length} line{group.lines.length !== 1 ? 's' : ''})
          </span>
        </div>
      </div>
    )
  }

  const renderItem = (entry: { line?: LogLine; group?: LogGroup; groupIndex?: number; globalIndex: number }) => {
    if (entry.group && entry.groupIndex !== undefined) {
      return renderGroupHeader(entry.group, entry.groupIndex, entry.globalIndex)
    } else if (entry.line) {
      return renderLine({ line: entry.line, globalIndex: entry.globalIndex })
    }
    return null
  }

  return (
    <div ref={containerRef} className="text-sm space-y-0">
      {truncatedInfo ? (
        <>
          <div className="text-xs text-gray-500 mb-2">Showing first {truncatedInfo.head.length} and last {truncatedInfo.tail.length} lines of {flatLines.length}. {truncatedInfo.omitted} lines omitted. <button className="text-blue-400 hover:underline" onClick={() => setShowAll(true)}>Show all</button></div>
          {truncatedInfo.head.map(renderItem)}
          <div className="text-center text-gray-600 text-xs py-1">… {truncatedInfo.omitted} lines omitted …</div>
          {truncatedInfo.tail.map(renderItem)}
        </>
      ) : (
        flatLines.map(renderItem)
      )}
    </div>
  )
}