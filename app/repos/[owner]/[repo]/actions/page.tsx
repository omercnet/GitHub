'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import LogFormatter from '@/app/components/LogFormatter'

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

export default function ActionsPage() {
  const params = useParams()
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedRuns, setExpandedRuns] = useState<Set<number>>(new Set())
  const [runJobs, setRunJobs] = useState<Record<number, Job[]>>({})
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [jobLogs, setJobLogs] = useState('')
  const [jobLogOffset, setJobLogOffset] = useState(0)
  const [isLoadingJobLogs, setIsLoadingJobLogs] = useState(false)
  const logIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetchWorkflowRuns()
  }, [params.owner, params.repo])

  useEffect(() => {
    if (selectedJob) {
      startJobLogPolling()
    } else {
      stopJobLogPolling()
    }

    return () => stopJobLogPolling()
  }, [selectedJob])

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

  const fetchJobsForRun = async (runId: number) => {
    try {
      const response = await fetch(`/api/repos/${params.owner}/${params.repo}/actions/${runId}/jobs`)
      if (response.ok) {
        const data = await response.json()
        setRunJobs(prev => ({
          ...prev,
          [runId]: data.jobs || []
        }))
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
      }
    } catch (error) {
      console.error('Failed to fetch job logs:', error)
    } finally {
      setIsLoadingJobLogs(false)
    }
  }

  const startJobLogPolling = () => {
    if (!selectedJob) return
    
    logIntervalRef.current = setInterval(() => {
      if (selectedJob && (selectedJob.status === 'in_progress' || selectedJob.status === 'queued')) {
        fetchJobLogs(selectedJob.id, jobLogOffset)
      }
    }, 5000)
  }

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

      {/* Job Logs Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg w-full max-w-6xl max-h-96 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">
                Job Logs: {selectedJob.name}
              </h2>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-4 bg-gray-900 h-80 overflow-auto">
              {isLoadingJobLogs && jobLogs === '' ? (
                <div className="text-gray-400">Loading job logs...</div>
              ) : (
                <LogFormatter logs={jobLogs || ''} />
              )}
            </div>
            <div className="p-4 border-t border-gray-700 text-sm text-gray-400">
              Auto-refreshing every 5 seconds for running jobs
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
    </div>
  )
}