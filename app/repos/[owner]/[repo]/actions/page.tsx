'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import LogFormatter from '@/app/components/LogFormatter'
import { cache, CACHE_TTL } from '@/app/lib/cache'

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

interface Job {
  id: number
  name: string
  status: string
  conclusion: string | null
  started_at: string | null
  completed_at: string | null
  html_url: string
  run_id: number
}

interface WorkflowInput {
  description: string
  required: boolean
  type: 'string' | 'boolean' | 'choice'
  default?: string | boolean
  options?: string[]
}

interface Workflow {
  id: number
  name: string
  path: string
  state: string
  inputs: Record<string, WorkflowInput>
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
  const [expandedRuns, setExpandedRuns] = useState<Set<number>>(new Set())
  const [runJobs, setRunJobs] = useState<Record<number, Job[]>>({})
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)
  const [jobLogs, setJobLogs] = useState('')
  const [jobLogOffset, setJobLogOffset] = useState(0)
  const [isLoadingJobLogs, setIsLoadingJobLogs] = useState(false)
  const [activeTab, setActiveTab] = useState<'runs' | 'manual'>('runs')
  const logIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchWorkflowRuns = useCallback(async (forceRefresh = false) => {
    setIsLoading(true)
    
    const cacheKey = cache.getWorkflowRunsKey(params.owner as string, params.repo as string)
    
    // Try to get from cache if not forcing refresh
    if (!forceRefresh) {
      const cachedData = cache.get<WorkflowRun[]>(cacheKey)
      if (cachedData) {
        setWorkflowRuns(cachedData)
        setIsLoading(false)
        return
      }
    }
    
    try {
      const response = await fetch(`/api/repos/${params.owner}/${params.repo}/actions`)
      if (response.ok) {
        const data = await response.json()
        const runs = data.workflow_runs || []
        setWorkflowRuns(runs)
        
        // Cache the data
        cache.set(cacheKey, runs, CACHE_TTL.WORKFLOW_RUNS)
      }
    } catch (error) {
      console.error('Failed to fetch workflow runs:', error)
    } finally {
      setIsLoading(false)
    }
  }, [params.owner, params.repo])

  const fetchJobsForRun = async (runId: number) => {
    const cacheKey = cache.getRunJobsKey(params.owner as string, params.repo as string, runId)
    
    // Try to get from cache first
    const cachedJobs = cache.get<Job[]>(cacheKey)
    if (cachedJobs) {
      setRunJobs(prev => ({
        ...prev,
        [runId]: cachedJobs
      }))
      return
    }
    
    try {
      const response = await fetch(`/api/repos/${params.owner}/${params.repo}/actions/${runId}/jobs`)
      if (response.ok) {
        const data = await response.json()
        const jobs = data.jobs || []
        setRunJobs(prev => ({
          ...prev,
          [runId]: jobs
        }))
        
        // Cache the jobs data
        cache.set(cacheKey, jobs, CACHE_TTL.RUN_JOBS)
      }
    } catch (error) {
      console.error('Failed to fetch jobs for run:', error)
    }
  }

  const downloadWorkflowLogs = async (runId: number) => {
    try {
      const response = await fetch(`/api/repos/${params.owner}/${params.repo}/actions/${runId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.downloadUrl) {
          window.open(data.downloadUrl, '_blank')
        }
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to get download link')
      }
    } catch (error) {
      alert('Failed to get download link')
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

  const toggleRunExpansion = (runId: number) => {
    const newExpanded = new Set(expandedRuns)
    if (newExpanded.has(runId)) {
      newExpanded.delete(runId)
    } else {
      newExpanded.add(runId)
      // Fetch jobs if we don't have them yet
      if (!runJobs[runId]) {
        fetchJobsForRun(runId)
      }
    }
    setExpandedRuns(newExpanded)
  }

  const viewJobLogs = async (job: Job) => {
    setSelectedJob(job)
    setJobLogs('')
    setJobLogOffset(0)
    await fetchJobLogs(job.id, 0)
  }

  const fetchJobLogs = async (jobId: number, offset: number) => {
    setIsLoadingJobLogs(true)
    
    const cacheKey = cache.getJobLogsKey(params.owner as string, params.repo as string, jobId)
    
    // For offset 0, try to get from cache first
    if (offset === 0) {
      const cachedLogs = cache.get<{ content: string; totalLength: number }>(cacheKey)
      if (cachedLogs) {
        setJobLogs(cachedLogs.content)
        setJobLogOffset(cachedLogs.totalLength)
        setIsLoadingJobLogs(false)
        return
      }
    }
    
    try {
      const response = await fetch(
        `/api/repos/${params.owner}/${params.repo}/actions/jobs/${jobId}?offset=${offset}`
      )
      
      if (response.ok) {
        const data = await response.json()
        
        if (offset === 0) {
          setJobLogs(data.content)
        } else {
          setJobLogs(prev => prev + data.content)
        }
        
        setJobLogOffset(data.totalLength)
        
        // Cache completed job logs (they won't change)
        if (selectedJob && selectedJob.status === 'completed') {
          const logData = {
            content: offset === 0 ? data.content : jobLogs + data.content,
            totalLength: data.totalLength
          }
          cache.set(cacheKey, logData, CACHE_TTL.COMPLETED_JOB_LOGS)
        } else if (offset === 0) {
          // Cache running job logs for shorter time
          const logData = {
            content: data.content,
            totalLength: data.totalLength
          }
          cache.set(cacheKey, logData, CACHE_TTL.RUNNING_JOB_LOGS)
        }
      }
    } catch (error) {
      console.error('Failed to fetch job logs:', error)
    } finally {
      setIsLoadingJobLogs(false)
    }
  }

  const startJobLogPolling = useCallback(() => {
    if (!selectedJob) return
    
    logIntervalRef.current = setInterval(() => {
      if (selectedJob && (selectedJob.status === 'in_progress' || selectedJob.status === 'queued')) {
        fetchJobLogs(selectedJob.id, jobLogOffset)
      }
    }, 5000)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedJob, jobLogOffset])

  const stopJobLogPolling = () => {
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

  useEffect(() => {
    fetchWorkflowRuns()
    fetchManualWorkflows()
    fetchBranches()
  }, [fetchWorkflowRuns, params.owner, params.repo])

  useEffect(() => {
    if (selectedJob) {
      startJobLogPolling()
    } else {
      stopJobLogPolling()
    }

    return () => stopJobLogPolling()
  }, [selectedJob, startJobLogPolling])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Actions</h1>
        <button
          onClick={() => fetchWorkflowRuns(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
        >
          Refresh
        </button>
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

      {/* Job Logs Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg w-full h-full max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-700 flex-shrink-0">
              <h2 className="text-xl font-bold text-white">
                Job Logs: {selectedJob.name}
              </h2>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-gray-400 hover:text-white text-2xl leading-none"
              >
                ✕
              </button>
            </div>
            <div className="p-4 bg-gray-900 flex-1 overflow-auto">
              {isLoadingJobLogs && jobLogs === '' ? (
                <div className="text-gray-400">Loading job logs...</div>
              ) : (
                <LogFormatter logs={jobLogs || ''} />
              )}
            </div>
            <div className="p-4 border-t border-gray-700 text-sm text-gray-400 flex-shrink-0">
              Auto-refreshing every 5 seconds for running jobs
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'runs' ? (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : workflowRuns.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No workflow runs found</div>
        ) : (
          <div className="divide-y divide-gray-700">
            {workflowRuns.map((run) => (
              <div key={run.id}>
                {/* Workflow Run Header */}
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => toggleRunExpansion(run.id)}
                        className="text-gray-400 hover:text-white"
                      >
                        {expandedRuns.has(run.id) ? '▼' : '▶'}
                      </button>
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
                        onClick={() => downloadWorkflowLogs(run.id)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                      >
                        Download Logs
                      </button>
                      <button
                        onClick={() => rerunWorkflow(run.id)}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
                      >
                        Re-run
                      </button>
                      <button
                        onClick={() => {
                          cache.clear()
                          fetchWorkflowRuns(true)
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                        title="Clear cache and refresh"
                      >
                        Clear Cache
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

                {/* Jobs List (when expanded) */}
                {expandedRuns.has(run.id) && (
                  <div className="bg-gray-900 border-t border-gray-700">
                    {runJobs[run.id] ? (
                      runJobs[run.id].length > 0 ? (
                        <div className="divide-y divide-gray-700">
                          {runJobs[run.id].map((job) => (
                            <div key={job.id} className="p-4 pl-8">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <span className="text-lg">{getStatusIcon(job.status, job.conclusion)}</span>
                                  <div>
                                    <h4 className="text-white font-medium">{job.name}</h4>
                                    <div className="text-sm text-gray-400">
                                      <span className={getStatusColor(job.status, job.conclusion)}>
                                        {job.conclusion || job.status}
                                      </span>
                                      {job.started_at && (
                                        <>
                                          {' · Started '}
                                          <span>{formatDate(job.started_at)}</span>
                                        </>
                                      )}
                                      {job.completed_at && (
                                        <>
                                          {' · Completed '}
                                          <span>{formatDate(job.completed_at)}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => viewJobLogs(job)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                                  >
                                    View Logs
                                  </button>
                                  <a
                                    href={job.html_url}
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
                      ) : (
                        <div className="p-4 pl-8 text-gray-400">No jobs found for this workflow run</div>
                      )
                    ) : (
                      <div className="p-4 pl-8 text-gray-400">Loading jobs...</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
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
  const params = useParams()
  const [selectedBranch, setSelectedBranch] = useState(branches.find(b => b.name === 'main')?.name || branches[0]?.name || 'main')
  const [inputs, setInputs] = useState<Record<string, string>>(() => {
    const defaultInputs: Record<string, string> = {}
    Object.entries(workflow.inputs).forEach(([key, config]) => {
      defaultInputs[key] = config.default?.toString() || ''
    })
    return defaultInputs
  })
  const [workflowInputs, setWorkflowInputs] = useState<Record<string, WorkflowInput>>(workflow.inputs)
  const [isLoadingInputs, setIsLoadingInputs] = useState(false)

  // Fetch workflow inputs for the selected branch
  const fetchWorkflowInputsForBranch = async (branchName: string) => {
    if (!branchName) return
    
    setIsLoadingInputs(true)
    try {
      const response = await fetch(`/api/repos/${params.owner}/${params.repo}/workflows?ref=${branchName}`)
      if (response.ok) {
        const data = await response.json()
        // Find the current workflow in the response
        const currentWorkflow = data.workflows.find((w: Workflow) => w.id === workflow.id)
        if (currentWorkflow && currentWorkflow.inputs) {
          setWorkflowInputs(currentWorkflow.inputs)
          
          // Reset inputs with new defaults
          const newInputs: Record<string, string> = {}
          const typedInputs = currentWorkflow.inputs as Record<string, WorkflowInput>
          Object.entries(typedInputs).forEach(([key, config]) => {
            newInputs[key] = config.default?.toString() || ''
          })
          setInputs(newInputs)
        }
      }
    } catch (error) {
      // If there's an error, keep the current inputs
    } finally {
      setIsLoadingInputs(false)
    }
  }

  // Handle branch change
  const handleBranchChange = (branchName: string) => {
    setSelectedBranch(branchName)
    fetchWorkflowInputsForBranch(branchName)
  }

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
              onChange={(e) => handleBranchChange(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoadingInputs}
            >
              {branches.map((branch) => (
                <option key={branch.name} value={branch.name}>
                  {branch.name}
                </option>
              ))}
            </select>
            {isLoadingInputs && (
              <p className="text-sm text-gray-400 mt-1">Loading workflow inputs for {selectedBranch}...</p>
            )}
          </div>

          {/* Workflow Inputs */}
          {Object.entries(workflowInputs).map(([key, config]) => (
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
                  disabled={isLoadingInputs}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="">Select an option</option>
                  {config.options?.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : config.type === 'boolean' ? (
                <select
                  value={inputs[key] || config.default?.toString() || 'false'}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                  disabled={isLoadingInputs}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={inputs[key] || ''}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                  placeholder={config.default?.toString() || ''}
                  required={config.required}
                  disabled={isLoadingInputs}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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
              disabled={isLoadingInputs}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingInputs ? 'Loading...' : 'Run workflow'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}