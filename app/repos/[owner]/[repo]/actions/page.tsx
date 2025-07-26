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

interface Workflow {
  id: number
  name: string
  path: string
  state: string
  inputs: Record<string, {
    description?: string
    required?: boolean
    default?: string
    type?: string
  }>
}

interface Branch {
  name: string
  commit: {
    sha: string
  }
}

export default function ActionsPage() {
  const params = useParams()
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>([])
  const [manualWorkflows, setManualWorkflows] = useState<Workflow[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(true)
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null)
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)
  const [logs, setLogs] = useState('')
  const [logOffset, setLogOffset] = useState(0)
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)
  const [activeTab, setActiveTab] = useState<'runs' | 'manual'>('runs')
  const logIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetchWorkflowRuns()
    fetchManualWorkflows()
    fetchBranches()
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

  const fetchManualWorkflows = async () => {
    setIsLoadingWorkflows(true)
    try {
      const response = await fetch(`/api/repos/${params.owner}/${params.repo}/workflows`)
      if (response.ok) {
        const data = await response.json()
        setManualWorkflows(data.workflows || [])
      }
    } catch (error) {
      console.error('Failed to fetch manual workflows:', error)
    } finally {
      setIsLoadingWorkflows(false)
    }
  }

  const fetchBranches = async () => {
    try {
      const response = await fetch(`/api/repos/${params.owner}/${params.repo}/branches`)
      if (response.ok) {
        const data = await response.json()
        setBranches(data.branches || [])
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error)
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

  const dispatchWorkflow = async (workflowId: number, ref: string, inputs: Record<string, string>) => {
    try {
      const response = await fetch(
        `/api/repos/${params.owner}/${params.repo}/workflows/${workflowId}/dispatch`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ref, inputs }),
        }
      )

      if (response.ok) {
        setSelectedWorkflow(null)
        fetchWorkflowRuns()
        setActiveTab('runs')
        alert('Workflow dispatched successfully! Check the runs tab for progress.')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to dispatch workflow')
      }
    } catch (error) {
      alert('Failed to dispatch workflow')
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
        <div className="flex space-x-2">
          <button
            onClick={fetchWorkflowRuns}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('runs')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'runs'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              Workflow Runs
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'manual'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              Manual Workflows
            </button>
          </nav>
        </div>
      </div>

      {/* Workflow Dispatch Modal */}
      {selectedWorkflow && (
        <WorkflowDispatchModal
          workflow={selectedWorkflow}
          branches={branches}
          onClose={() => setSelectedWorkflow(null)}
          onDispatch={dispatchWorkflow}
        />
      )}

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

      {/* Tab Content */}
      {activeTab === 'runs' ? (
        <WorkflowRunsList
          workflowRuns={workflowRuns}
          isLoading={isLoading}
          onViewLogs={viewLogs}
          onRerunWorkflow={rerunWorkflow}
          getStatusIcon={getStatusIcon}
          getStatusColor={getStatusColor}
          formatDate={formatDate}
          formatSha={formatSha}
        />
      ) : (
        <ManualWorkflowsList
          workflows={manualWorkflows}
          isLoading={isLoadingWorkflows}
          onRunWorkflow={setSelectedWorkflow}
        />
      )}
    </div>
  )
}

// Workflow Runs List Component
function WorkflowRunsList({
  workflowRuns,
  isLoading,
  onViewLogs,
  onRerunWorkflow,
  getStatusIcon,
  getStatusColor,
  formatDate,
  formatSha,
}: {
  workflowRuns: WorkflowRun[]
  isLoading: boolean
  onViewLogs: (run: WorkflowRun) => void
  onRerunWorkflow: (runId: number) => void
  getStatusIcon: (status: string, conclusion: string | null) => string
  getStatusColor: (status: string, conclusion: string | null) => string
  formatDate: (dateString: string) => string
  formatSha: (sha: string) => string
}) {
  return (
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
                    onClick={() => onViewLogs(run)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                  >
                    View Logs
                  </button>
                  <button
                    onClick={() => onRerunWorkflow(run.id)}
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
  )
}

// Manual Workflows List Component
function ManualWorkflowsList({
  workflows,
  isLoading,
  onRunWorkflow,
}: {
  workflows: Workflow[]
  isLoading: boolean
  onRunWorkflow: (workflow: Workflow) => void
}) {
  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      {isLoading ? (
        <div className="p-8 text-center text-gray-400">Loading...</div>
      ) : workflows.length === 0 ? (
        <div className="p-8 text-center text-gray-400">
          No manual workflows found. Workflows must have a <code className="bg-gray-700 px-1 rounded">workflow_dispatch</code> trigger to be run manually.
        </div>
      ) : (
        <div className="divide-y divide-gray-700">
          {workflows.map((workflow) => (
            <div key={workflow.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">⚡</span>
                  <div>
                    <h3 className="text-white font-medium">{workflow.name}</h3>
                    <div className="text-sm text-gray-400">
                      <span>{workflow.path}</span>
                      {' · '}
                      <span className="capitalize">{workflow.state}</span>
                      {Object.keys(workflow.inputs).length > 0 && (
                        <>
                          {' · '}
                          <span>{Object.keys(workflow.inputs).length} input{Object.keys(workflow.inputs).length > 1 ? 's' : ''}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => onRunWorkflow(workflow)}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                  >
                    Run workflow
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Workflow Dispatch Modal Component
function WorkflowDispatchModal({
  workflow,
  branches,
  onClose,
  onDispatch,
}: {
  workflow: Workflow
  branches: Branch[]
  onClose: () => void
  onDispatch: (workflowId: number, ref: string, inputs: Record<string, string>) => void
}) {
  const [selectedBranch, setSelectedBranch] = useState(branches.find(b => b.name === 'main')?.name || branches[0]?.name || 'main')
  const [inputs, setInputs] = useState<Record<string, string>>(() => {
    const defaultInputs: Record<string, string> = {}
    Object.entries(workflow.inputs).forEach(([key, config]) => {
      defaultInputs[key] = config.default || ''
    })
    return defaultInputs
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onDispatch(workflow.id, selectedBranch, inputs)
  }

  const handleInputChange = (key: string, value: string) => {
    setInputs(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Run workflow: {workflow.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-auto max-h-[calc(90vh-120px)]">
          {/* Branch Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Use workflow from
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {branches.map((branch) => (
                <option key={branch.name} value={branch.name}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          {/* Workflow Inputs */}
          {Object.entries(workflow.inputs).map(([key, config]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {key}
                {config.required && <span className="text-red-400 ml-1">*</span>}
              </label>
              {config.description && (
                <p className="text-sm text-gray-400 mb-2">{config.description}</p>
              )}
              {config.type === 'choice' ? (
                <select
                  value={inputs[key] || ''}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                  required={config.required}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select an option</option>
                  {/* Note: GitHub choices would need to be parsed from the YAML */}
                </select>
              ) : config.type === 'boolean' ? (
                <select
                  value={inputs[key] || config.default || 'false'}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={inputs[key] || ''}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                  placeholder={config.default || ''}
                  required={config.required}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
          ))}

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              Run workflow
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}