'use client'

import { File, Folder, GitCommit, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface FileItem {
  name: string
  path: string
  type: 'file' | 'dir'
  size?: number
  lastCommit?: {
    sha: string
    message: string
    author: {
      name?: string
      email?: string
      date?: string
      avatar_url?: string
    }
    url: string
  } | null
}

interface EnhancedFileTableProps {
  items: FileItem[]
  onItemClick: (item: FileItem) => void
}

export default function EnhancedFileTable({ items, onItemClick }: EnhancedFileTableProps) {
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`
    return `${Math.round(bytes / 1048576)} MB`
  }

  const truncateMessage = (message: string, maxLength: number = 50) => {
    if (message.length <= maxLength) return message
    return message.substring(0, maxLength) + '...'
  }

  const formatCommitDate = (dateString?: string) => {
    if (!dateString) return ''
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
      return ''
    }
  }

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-800 border-b border-gray-700">
          <tr>
            <th className="text-left py-2 px-4 text-sm font-medium text-gray-300">Name</th>
            <th className="text-left py-2 px-4 text-sm font-medium text-gray-300">Last commit message</th>
            <th className="text-left py-2 px-4 text-sm font-medium text-gray-300">Last commit date</th>
            <th className="text-right py-2 px-4 text-sm font-medium text-gray-300">Size</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr
              key={item.path}
              className={`border-b border-gray-800 hover:bg-gray-800 cursor-pointer transition-colors ${
                index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-850'
              }`}
              onClick={() => onItemClick(item)}
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  {item.type === 'dir' ? (
                    <Folder size={16} className="text-blue-400 flex-shrink-0" />
                  ) : (
                    <File size={16} className="text-gray-400 flex-shrink-0" />
                  )}
                  <span className="text-blue-400 hover:underline">{item.name}</span>
                </div>
              </td>
              <td className="py-3 px-4">
                {item.lastCommit ? (
                  <div className="flex items-center gap-2">
                    <GitCommit size={14} className="text-gray-500 flex-shrink-0" />
                    <span className="text-gray-300 text-sm">
                      {truncateMessage(item.lastCommit.message)}
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-500 text-sm">No commit info</span>
                )}
              </td>
              <td className="py-3 px-4">
                {item.lastCommit?.author?.date ? (
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-gray-500 flex-shrink-0" />
                    <span className="text-gray-400 text-sm">
                      {formatCommitDate(item.lastCommit.author.date)}
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-500 text-sm">-</span>
                )}
              </td>
              <td className="py-3 px-4 text-right">
                <span className="text-gray-400 text-sm">
                  {item.type === 'dir' ? '-' : formatFileSize(item.size)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {items.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No files found in this directory
        </div>
      )}
    </div>
  )
}
