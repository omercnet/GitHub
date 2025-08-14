'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import BranchSelector from '@/app/components/BranchSelector'
import EnhancedFileTable from '@/app/components/EnhancedFileTable'

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

interface GitHubAPIItem {
  name: string
  path: string
  type: 'dir' | 'file'
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

interface FileContent {
  name: string
  content: string
  encoding: string
}

export default function CodePage() {
  const params = useParams()
  const [currentPath, setCurrentPath] = useState('')
  const [currentBranch, setCurrentBranch] = useState('main')
  const [items, setItems] = useState<FileItem[]>([])
  const [fileContent, setFileContent] = useState<FileContent | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const loadDirectory = async (path: string) => {
    setIsLoading(true)
    setFileContent(null)
    
    try {
      const response = await fetch(
        `/api/repos/${params.owner}/${params.repo}/contents?path=${encodeURIComponent(path)}&ref=${encodeURIComponent(currentBranch)}`
      )
      
      if (response.ok) {
        const data = await response.json()
        
        if (Array.isArray(data)) {
          // Directory contents with enhanced commit info
          const fileItems: FileItem[] = data.map((item: GitHubAPIItem) => ({
            name: item.name,
            path: item.path,
            type: item.type === 'dir' ? 'dir' : 'file',
            size: item.size,
            lastCommit: item.lastCommit,
          }))
          
          setItems(fileItems)
          setCurrentPath(path)
        } else {
          // Single file
          loadFile(data)
        }
      } else {
        console.error('Failed to load contents')
        setItems([])
      }
    } catch (error) {
      console.error('Error loading directory:', error)
      setItems([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const loadInitialDirectory = async () => {
      setIsLoading(true)
      setFileContent(null)
      
      try {
        const response = await fetch(
          `/api/repos/${params.owner}/${params.repo}/contents?path=&ref=${encodeURIComponent(currentBranch)}`
        )
        
        if (response.ok) {
          const data = await response.json()
          
          if (Array.isArray(data)) {
            const fileItems: FileItem[] = data.map((item: GitHubAPIItem) => ({
              name: item.name,
              path: item.path,
              type: item.type === 'dir' ? 'dir' : 'file',
              size: item.size,
              lastCommit: item.lastCommit,
            }))
            
            setItems(fileItems)
            setCurrentPath('')
          }
        } else {
          console.error('Failed to load contents')
          setItems([])
        }
      } catch (error) {
        console.error('Error loading directory:', error)
        setItems([])
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialDirectory()
  }, [params.owner, params.repo, currentBranch])

  const loadFile = (data: GitHubAPIItem & { content?: string; encoding?: string }) => {
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

  const handleBranchChange = (branch: string) => {
    setCurrentBranch(branch)
    setCurrentPath('')
  }

  const navigateUp = () => {
    const pathParts = currentPath.split('/').filter(Boolean)
    pathParts.pop()
    const parentPath = pathParts.join('/')
    loadDirectory(parentPath)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="bg-card rounded-lg overflow-hidden">
        {/* Header with Branch Selector */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <BranchSelector
              owner={params.owner as string}
              repo={params.repo as string}
              currentBranch={currentBranch}
              onBranchChange={handleBranchChange}
            />
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center space-x-2 text-sm">
            <button
              onClick={() => loadDirectory('')}
              className="text-accent hover:underline"
            >
              {params.repo}
            </button>
            {currentPath.split('/').filter(Boolean).map((segment, index, array) => {
              const segmentPath = array.slice(0, index + 1).join('/')
              return (
                <span key={segmentPath} className="flex items-center space-x-2">
                  <span className="text-muted-foreground">/</span>
                  <button
                    onClick={() => loadDirectory(segmentPath)}
                    className="text-accent hover:underline"
                  >
                    {segment}
                  </button>
                </span>
              )
            })}
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : fileContent ? (
          /* File content view */
          <div>
            <div className="p-4 border-b border-border bg-muted">
              <h3 className="text-foreground font-medium">{fileContent.name}</h3>
            </div>
            <pre className="p-4 text-sm text-muted-foreground overflow-auto bg-background">
              <code>{fileContent.content}</code>
            </pre>
          </div>
        ) : (
          /* Directory listing with Enhanced File Table */
          <div className="p-4">
            {currentPath && (
              <div
                onClick={navigateUp}
                className="flex items-center p-3 hover:bg-muted cursor-pointer mb-4 rounded"
              >
                <div className="text-accent">📁 ..</div>
              </div>
            )}
            <EnhancedFileTable
              items={items}
              onItemClick={handleItemClick}
            />
          </div>
        )}
      </div>
    </div>
  )
}