'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'

interface WorkflowRun {
  id: number
  name: string
  status: string
  conclusion: string | null
  head_branch: string
  head_sha: string
  created_at: string
  updated_at: string
  html_url: string
}

export default function ActionsPage() {
  const params = useParams()
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null)
  const [logs, setLogs] = useState('')
  const [logOffset, setLogOffset] = useState(0)
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)
  const logIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetchWorkflowRuns()
  }, [params.owner, params.repo])

  useEffect(() => {
    if (selectedRun) {
      startLogPolling()
    } else {
      stopLogPolling()
    }

    return () => stopLogPolling()
  }, [selectedRun])

  const fetchWorkflowRuns = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/repos/${params.owner}/${params.repo}/actions`)
      if (response.ok) {
        const data = await response.json()
        setWorkflowRuns(data.workflow_runs || [])
      }
    } catch (error) {
      console.error('Failed to fetch workflow runs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const rerunWorkflow = async (runId: number) => {
    try {
      const response = await fetch(
        `/api/repos/${params.owner}/${params.repo}/actions/${runId}`,
        { method: 'POST' }
      )

      if (response.ok) {
        fetchWorkflowRuns()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to rerun workflow')
      }
    } catch (error) {
      alert('Failed to rerun workflow')
    }
  }

  const viewLogs = async (run: WorkflowRun) => {
    setSelectedRun(run)
    setLogs('')
    setLogOffset(0)
    await fetchLogs(run.id, 0)
  }

  const fetchLogs = async (runId: number, offset: number) => {
    setIsLoadingLogs(true)
    try {
      const response = await fetch(
        `/api/repos/${params.owner}/${params.repo}/actions/${runId}?offset=${offset}`
      )
      
      if (response.ok) {
        const data = await response.json()
        
        if (offset === 0) {
          setLogs(data.content)
        } else {
          setLogs(prev => prev + data.content)
        }
        
        setLogOffset(data.totalLength)
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    } finally {
      setIsLoadingLogs(false)
    }
  }

  const startLogPolling = () => {
    if (!selectedRun) return
    
    logIntervalRef.current = setInterval(() => {
      if (selectedRun && (selectedRun.status === 'in_progress' || selectedRun.status === 'queued')) {
        fetchLogs(selectedRun.id, logOffset)
      }
    }, 5000)
  }

  const stopLogPolling = () => {
    if (logIntervalRef.current) {
      clearInterval(logIntervalRef.current)
      logIntervalRef.current = null
    }
  }

  const getStatusIcon = (status: string, conclusion: string | null) => {
    if (status === 'completed') {
      switch (conclusion) {
        case 'success': return '✅'
        case 'failure': return '❌'
        case 'cancelled': return '⚪'
        case 'skipped': return '⚪'
        default: return '❓'
      }
    }
    switch (status) {
      case 'in_progress': return '🟡'
      case 'queued': return '🟡'
      default: return '⚪'
    }
  }

  const getStatusColor = (status: string, conclusion: string | null) => {
    if (status === 'completed') {
      switch (conclusion) {
        case 'success': return 'text-green-400'
        case 'failure': return 'text-red-400'
        case 'cancelled': return 'text-gray-400'
        case 'skipped': return 'text-gray-400'
        default: return 'text-gray-400'
      }
    }
    switch (status) {
      case 'in_progress': return 'text-yellow-400'
      case 'queued': return 'text-yellow-400'
      default: return 'text-gray-400'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const formatSha = (sha: string) => {
    return sha.substring(0, 7)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Actions</h1>
        <button
          onClick={fetchWorkflowRuns}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Logs Modal */}
      {selectedRun && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg w-full max-w-6xl max-h-96 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">
                Logs for {selectedRun.name} - {formatSha(selectedRun.head_sha)}
              </h2>
              <button
                onClick={() => setSelectedRun(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-4 bg-gray-900 h-80 overflow-auto">
              {isLoadingLogs && logs === '' ? (
                <div className="text-gray-400">Loading logs...</div>
              ) : (
                <pre className="text-sm text-gray-300 whitespace-pre-wrap">
                  {logs || 'No logs available'}
                </pre>
              )}
            </div>
            <div className="p-4 border-t border-gray-700 text-sm text-gray-400">
              Auto-refreshing every 5 seconds for running workflows
            </div>
          </div>
        </div>
      )}

      {/* Workflow Runs List */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : workflowRuns.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No workflow runs found</div>
        ) : (
          <div className="divide-y divide-gray-700">
            {workflowRuns.map((run) => (
              <div key={run.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{getStatusIcon(run.status, run.conclusion)}</span>
                    <div>
                      <h3 className="text-white font-medium">{run.name}</h3>
                      <div className="text-sm text-gray-400">
                        <span className={getStatusColor(run.status, run.conclusion)}>
                          {run.conclusion || run.status}
                        </span>
                        {' · '}
                        <span>{run.head_branch}</span>
                        {' · '}
                        <span>{formatSha(run.head_sha)}</span>
                        {' · '}
                        <span>{formatDate(run.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => viewLogs(run)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                    >
                      View Logs
                    </button>
                    <button
                      onClick={() => rerunWorkflow(run.id)}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
                    >
                      Re-run
                    </button>
                    <a
                      href={run.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm inline-block"
                    >
                      GitHub
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}