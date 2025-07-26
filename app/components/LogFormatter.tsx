'use client'

import { useState, useMemo } from 'react'

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
}

export default function LogFormatter({ logs }: LogFormatterProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const parsedLogs = useMemo(() => {
    if (!logs) return []

    const lines = logs.split('\n')
    const parsed: LogLine[] = []
    let currentLevel = 0

    for (const line of lines) {
      if (!line.trim()) continue

      // Extract timestamp (ISO format at the beginning)
      const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)\s(.*)/)
      const timestamp = timestampMatch ? timestampMatch[1] : undefined
      const content = timestampMatch ? timestampMatch[2] : line

      // Identify log line type
      if (content.startsWith('##[group]')) {
        const groupName = content.replace('##[group]', '').trim()
        parsed.push({
          timestamp,
          content: groupName,
          type: 'group-start',
          groupName,
          level: currentLevel
        })
        currentLevel++
      } else if (content.startsWith('##[endgroup]')) {
        currentLevel = Math.max(0, currentLevel - 1)
        parsed.push({
          timestamp,
          content: '',
          type: 'group-end',
          level: currentLevel
        })
      } else if (content.startsWith('##[command]') || content.startsWith('##[section]')) {
        parsed.push({
          timestamp,
          content,
          type: 'command',
          level: currentLevel
        })
      } else if (content.toLowerCase().includes('error') || content.includes('❌') || content.includes('failed')) {
        parsed.push({
          timestamp,
          content,
          type: 'error',
          level: currentLevel
        })
      } else if (content.toLowerCase().includes('warning') || content.includes('⚠️') || content.includes('warn')) {
        parsed.push({
          timestamp,
          content,
          type: 'warning',
          level: currentLevel
        })
      } else {
        parsed.push({
          timestamp,
          content,
          type: 'regular',
          level: currentLevel
        })
      }
    }

    return parsed
  }, [logs])

  const groupedLogs = useMemo(() => {
    const groups: LogGroup[] = []
    let currentGroup: LogGroup | null = null
    let groupCounter = 0

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
        groupCounter++
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

  const toggleGroup = (groupName: string, index: number) => {
    const groupId = `group-${index}-${groupName}`
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId)
    } else {
      newExpanded.add(groupId)
    }
    setExpandedGroups(newExpanded)
  }

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return null
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    })
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

  if (!logs || logs.trim() === '') {
    return <div className="text-gray-400">No logs available</div>
  }

  return (
    <div className="font-mono text-sm">
      {groupedLogs.map((group, groupIndex) => {
        const groupId = `group-${groupIndex}-${group.name}`
        const isExpanded = expandedGroups.has(groupId)
        
        return (
          <div key={groupIndex} className="mb-1">
            {group.name ? (
              // Group with header
              <div>
                <button
                  onClick={() => toggleGroup(group.name, groupIndex)}
                  className="flex items-center text-purple-400 hover:text-purple-300 w-full text-left py-1"
                  style={{ paddingLeft: `${group.level * 16}px` }}
                >
                  <span className="mr-2">
                    {isExpanded ? '▼' : '▶'}
                  </span>
                  <span className="font-medium">📁 {group.name}</span>
                </button>
                {isExpanded && (
                  <div className="ml-4">
                    {group.lines.map((line, lineIndex) => (
                      <div
                        key={lineIndex}
                        className="flex py-0.5"
                        style={{ paddingLeft: `${line.level * 16}px` }}
                      >
                        {line.timestamp && (
                          <span className="text-gray-500 mr-3 w-20 text-xs">
                            {formatTimestamp(line.timestamp)}
                          </span>
                        )}
                        <span className={getLineTypeClass(line.type)}>
                          {line.content}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Standalone lines (not in a group)
              group.lines.map((line, lineIndex) => (
                <div
                  key={lineIndex}
                  className="flex py-0.5"
                  style={{ paddingLeft: `${line.level * 16}px` }}
                >
                  {line.timestamp && (
                    <span className="text-gray-500 mr-3 w-20 text-xs">
                      {formatTimestamp(line.timestamp)}
                    </span>
                  )}
                  <span className={getLineTypeClass(line.type)}>
                    {line.content}
                  </span>
                </div>
              ))
            )}
          </div>
        )
      })}
    </div>
  )
}