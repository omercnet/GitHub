'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

interface FileItem {
  name: string
  path: string
  type: 'file' | 'dir'
  size?: number
}

interface FileContent {
  name: string
  content: string
  encoding: string
}

export default function CodePage() {
  const params = useParams()
  const [currentPath, setCurrentPath] = useState('')
  const [items, setItems] = useState<FileItem[]>([])
  const [fileContent, setFileContent] = useState<FileContent | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadDirectory('')
  }, [params.owner, params.repo]) // Add dependencies

  const loadDirectory = async (path: string) => {
    setIsLoading(true)
    setFileContent(null)
    
    try {
      const response = await fetch(
        `/api/repos/${params.owner}/${params.repo}/contents?path=${encodeURIComponent(path)}`
      )
      
      if (response.ok) {
        const data = await response.json()
        
        if (Array.isArray(data)) {
          // Directory contents
          const fileItems: FileItem[] = data.map((item: any) => ({
            name: item.name,
            path: item.path,
            type: item.type === 'dir' ? 'dir' : 'file',
            size: item.size,
          }))
          
          setItems(fileItems)
          setCurrentPath(path)
        } else {
          // Single file
          loadFile(data)
        }
      }
    } catch (error) {
      console.error('Failed to load directory:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadFile = (data: any) => {
    if (data.content && data.encoding === 'base64') {
      try {
        const content = atob(data.content)
        setFileContent({
          name: data.name,
          content,
          encoding: data.encoding,
        })
        setCurrentPath(data.path)
      } catch (error) {
        console.error('Failed to decode file content:', error)
      }
    }
  }

  const handleItemClick = (item: FileItem) => {
    if (item.type === 'dir') {
      loadDirectory(item.path)
    } else {
      loadDirectory(item.path) // This will load the file content
    }
  }

  const navigateUp = () => {
    const pathParts = currentPath.split('/').filter(Boolean)
    pathParts.pop()
    const parentPath = pathParts.join('/')
    loadDirectory(parentPath)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        {/* Breadcrumb */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center space-x-2 text-sm">
            <button
              onClick={() => loadDirectory('')}
              className="text-blue-400 hover:underline"
            >
              {params.repo}
            </button>
            {currentPath.split('/').filter(Boolean).map((segment, index, array) => {
              const segmentPath = array.slice(0, index + 1).join('/')
              return (
                <span key={segmentPath} className="flex items-center space-x-2">
                  <span className="text-gray-400">/</span>
                  <button
                    onClick={() => loadDirectory(segmentPath)}
                    className="text-blue-400 hover:underline"
                  >
                    {segment}
                  </button>
                </span>
              )
            })}
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : fileContent ? (
          /* File content view */
          <div>
            <div className="p-4 border-b border-gray-700 bg-gray-750">
              <h3 className="text-white font-medium">{fileContent.name}</h3>
            </div>
            <pre className="p-4 text-sm text-gray-300 overflow-auto bg-gray-900">
              <code>{fileContent.content}</code>
            </pre>
          </div>
        ) : (
          /* Directory listing */
          <div>
            {currentPath && (
              <div
                onClick={navigateUp}
                className="flex items-center p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700"
              >
                <div className="text-blue-400">📁 ..</div>
              </div>
            )}
            {items.map((item) => (
              <div
                key={item.path}
                onClick={() => handleItemClick(item)}
                className="flex items-center justify-between p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0"
              >
                <div className="flex items-center space-x-3">
                  <span>{item.type === 'dir' ? '📁' : '📄'}</span>
                  <span className="text-white">{item.name}</span>
                </div>
                {item.size !== undefined && (
                  <span className="text-gray-400 text-sm">
                    {(item.size / 1024).toFixed(1)} KB
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}