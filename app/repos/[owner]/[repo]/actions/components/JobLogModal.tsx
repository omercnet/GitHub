"use client"
import React, { useEffect, useState, useCallback, useRef } from "react"
import { JobExtended, Annotation } from '@/app/lib/actions-types'
import { parseLogAnnotations } from '@/app/lib/actions-utils'
import LogFormatter from '@/app/components/LogFormatter'

type AnnotationLevelFilter = 'all' | 'failure' | 'warning' | 'notice'

interface Props {
  job: JobExtended
  owner: string
  repo: string
  onClose: () => void
}

export default function JobLogModal({ job, owner, repo, onClose }: Props) {
  const [logContent, setLogContent] = useState('')
  const [logOffset, setLogOffset] = useState(0)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<{ message: string; type?: string } | null>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [focusLine, setFocusLine] = useState<number | undefined>()
  const [annotationFilter, setAnnotationFilter] = useState<AnnotationLevelFilter>('all')
  const [jobStatus, setJobStatus] = useState(job.status)
  const [jobConclusion, setJobConclusion] = useState(job.conclusion)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  
  // Load initial size from sessionStorage or use defaults
  const getInitialSize = () => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('jobLogModalSize')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch {
          // Fallback to defaults if parsing fails
        }
      }
    }
    return { width: 1200, height: 800 }
  }
  
  const [modalSize, setModalSize] = useState(getInitialSize)
  const [isResizing, setIsResizing] = useState(false)

  const fetchLogs = useCallback(async (offset: number) => {
    const processLogResponse = async (offset: number, res: Response) => {
      // Clear any previous errors on successful fetch
      setError(null)
      
      const data = await res.json() as { 
        content: string; 
        totalLength: number; 
        isComplete?: boolean;
        jobStatus?: string;
        jobConclusion?: string | null;
        message?: string;
      }
      
      // Update job status if provided
      if (data.jobStatus) {
        setJobStatus(data.jobStatus)
        setJobConclusion(data.jobConclusion || null)
      }
      
      // Update status message if provided
      if (data.message) {
        setStatusMessage(data.message)
      }
      
      // Update log content
      if (offset === 0) { 
        setLogContent(data.content) 
      } else { 
        setLogContent(prev => prev + data.content) 
      }
      
      setLogOffset(data.totalLength)
      
      // Determine if we should continue streaming
      const shouldContinueStreaming = !data.isComplete && (data.jobStatus === 'in_progress' || data.jobStatus === 'queued')
      
      if (data.isComplete || !shouldContinueStreaming) {
        setIsStreaming(false)
      }
      
      // Parse annotations from current log content
      const fullContent = offset === 0 ? data.content : logContent + data.content
      const parsed = parseLogAnnotations(fullContent)
      setAnnotations(parsed)
    }

    try {
      const res = await fetch(`/api/repos/${owner}/${repo}/actions/jobs/${job.id}?offset=${offset}`)
      if (!res.ok) {
        const errorData = await res.json()
        if (errorData.error?.type === 'logs_not_found') {
          setError({ message: errorData.error.message, type: errorData.error.type })
          return
        }
        setError({ message: errorData.error?.message || 'Failed to fetch logs' })
        return
      }
      
      await processLogResponse(offset, res)
    } catch {
      setError({ message: 'Network error while fetching logs' })
      setIsStreaming(false)
    }
  }, [owner, repo, job.id, logContent])

  const startStreaming = useCallback(() => {
    setIsStreaming(true)
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(() => { fetchLogs(logOffset) }, 3000) // Poll every 3 seconds for better responsiveness
  }, [fetchLogs, logOffset])
  
  const stopStreaming = () => { 
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = null
    setIsStreaming(false) 
  }

  // Auto-start streaming for running jobs
  useEffect(() => { 
    fetchLogs(0)
    
    // Auto-start streaming if job is running
    if (job.status === 'in_progress' || job.status === 'queued') {
      setTimeout(() => setIsStreaming(true), 1000) // Start streaming after initial load
    }
  }, [fetchLogs, job.status])
  
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  useEffect(() => { if (isStreaming) startStreaming(); else stopStreaming(); }, [isStreaming, startStreaming])

  // Resize functionality
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true)
    const startX = e.clientX
    const startY = e.clientY
    const startWidth = modalSize.width
    const startHeight = modalSize.height

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(400, startWidth + (e.clientX - startX))
      const newHeight = Math.max(300, startHeight + (e.clientY - startY))
      const newSize = { width: newWidth, height: newHeight }
      setModalSize(newSize)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      // Save final size to sessionStorage when resize is complete
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('jobLogModalSize', JSON.stringify(modalSize))
      }
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [modalSize])

  const filteredAnnotations = annotations.filter(a => annotationFilter === 'all' || a.annotation_level === annotationFilter)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div 
        className="bg-gray-900 border border-gray-700 rounded-lg shadow-lg flex flex-col relative"
        style={{ 
          width: Math.min(modalSize.width, window.innerWidth - 40), 
          height: Math.min(modalSize.height, window.innerHeight - 40),
          maxWidth: '95vw',
          maxHeight: '95vh'
        }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-white truncate">Logs: {job.name}</h2>
            {isStreaming && (
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-400 text-xs">Live</span>
              </div>
            )}
            {jobStatus && jobStatus !== job.status && (
              <span className="text-yellow-400 text-xs px-2 py-0.5 bg-yellow-400/10 rounded">
                {jobStatus}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search logs" className="bg-gray-800 border border-gray-700 text-xs px-2 py-1 rounded text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48" />
            <button onClick={onClose} className="text-gray-400 hover:text-white text-lg">✕</button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden p-4 flex flex-col">
          <div className="flex-1 overflow-auto bg-black/40 border border-gray-700 rounded p-2">
            {error ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="text-gray-400 text-xl mb-2">📋</div>
                <div className="text-gray-300 text-sm font-medium mb-1">No logs available</div>
                <div className="text-gray-500 text-xs max-w-md">{error.message}</div>
                {error.type === 'logs_not_found' && (
                  <div className="text-gray-600 text-xs mt-2">
                    Logs may not be available for jobs that haven&apos;t started or completed yet
                  </div>
                )}
              </div>
            ) : logContent ? (
              <LogFormatter logs={logContent} searchTerm={searchTerm} focusLine={focusLine} />
            ) : statusMessage ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="text-blue-400 text-xl mb-2">⏳</div>
                <div className="text-gray-300 text-sm font-medium mb-1">Job {jobStatus}</div>
                <div className="text-gray-500 text-xs max-w-md">{statusMessage}</div>
                {isStreaming && (
                  <div className="text-green-400 text-xs mt-2 flex items-center gap-1">
                    <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></div>
                    Checking for updates...
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500 text-xs">Loading logs...</div>
            )}
          </div>
          {annotations.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-wide text-gray-400">Annotations ({filteredAnnotations.length})</span>
                <AnnotationFilterButtons value={annotationFilter} onChange={setAnnotationFilter} />
              </div>
              <AnnotationList annotations={filteredAnnotations} onJump={(l) => setFocusLine(l)} />
            </div>
          )}
        </div>
        <div className="px-4 py-2 border-t border-gray-700 text-[10px] text-gray-500 flex justify-between items-center">
          <div className="flex items-center gap-2">
            {isStreaming ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Live streaming (updates every 3s)</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                <span>
                  {jobStatus === 'completed' ? 
                    `Job completed ${jobConclusion ? `(${jobConclusion})` : ''}` : 
                    `Job status: ${jobStatus}`
                  }
                </span>
              </>
            )}
            {statusMessage && (
              <span className="text-yellow-400">• {statusMessage}</span>
            )}
          </div>
          {(jobStatus === 'in_progress' || jobStatus === 'queued') && !isStreaming && (
            <button 
              onClick={() => setIsStreaming(true)} 
              className="text-blue-400 hover:underline px-2 py-1 rounded border border-blue-500/30 hover:border-blue-500/50"
            >
              Start Live Updates
            </button>
          )}
          {isStreaming && (
            <button 
              onClick={stopStreaming} 
              className="text-orange-400 hover:underline px-2 py-1 rounded border border-orange-500/30 hover:border-orange-500/50"
            >
              Stop Streaming
            </button>
          )}
        </div>
        {/* Resize handle */}
        <div 
          className={`absolute bottom-0 right-0 w-4 h-4 cursor-nw-resize bg-gray-600 hover:bg-gray-500 ${isResizing ? 'bg-gray-500' : ''}`}
          onMouseDown={handleMouseDown}
          style={{ clipPath: 'polygon(100% 0, 0 100%, 100% 100%)' }}
        />
      </div>
    </div>
  )
}

function AnnotationFilterButtons({ value, onChange }: { value: AnnotationLevelFilter; onChange: (v: AnnotationLevelFilter) => void }) {
  const levels: AnnotationLevelFilter[] = ['all','failure','warning','notice']
  return (
    <div className="flex gap-1 text-[10px]">
      {levels.map(l => (
        <button key={l} onClick={() => onChange(l)} className={`px-2 py-0.5 border rounded ${value===l?'border-blue-500 text-blue-400':'border-gray-700 text-gray-400 hover:border-gray-500'}`}>{l}</button>
      ))}
    </div>
  )
}

function AnnotationList({ annotations, onJump }: { annotations: Annotation[]; onJump: (line?: number) => void }) {
  return (
    <div className="space-y-1 max-h-40 overflow-auto pr-1">
      {annotations.map((a,i) => (
        <div key={i} className="text-xs border border-gray-700 rounded p-1 hover:bg-gray-800 cursor-pointer" onClick={() => onJump(a.line)}>
          <div className="flex justify-between">
            <span className={`font-medium ${a.annotation_level==='failure'?'text-red-400':a.annotation_level==='warning'?'text-yellow-400':'text-blue-300'}`}>{a.annotation_level}</span>
            {typeof a.line==='number' && <span className="text-gray-500">L{a.line+1}</span>}
          </div>
          <div className="text-gray-300 truncate" title={a.message}>{a.message}</div>
          {a.path && <div className="text-gray-500 text-[10px]">{a.path}{a.start_line?`:${a.start_line}`:''}</div>}
        </div>
      ))}
    </div>
  )
}
