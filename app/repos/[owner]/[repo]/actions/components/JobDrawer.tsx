'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { JobExtended, Step } from '@/app/lib/actions-types'
import { formatDuration, relativeTime } from '@/app/lib/actions-utils'
import JobLogModal from './JobLogModal'

interface Props { runId: number; onClose: () => void; owner: string; repo: string }
interface FetchState<T> { data: T | null; loading: boolean; error?: string }

interface JobGroup { baseName: string; jobs: JobExtended[] }
function buildJobGroups(jobs: JobExtended[]): JobGroup[] {
  const map = new Map<string, JobExtended[]>()
  jobs.forEach(j => {
    const base = j.name.replace(/\s*\(.+?\)$/, '')
    const arr = map.get(base) || []
    arr.push(j)
    map.set(base, arr)
  })
  return Array.from(map.entries()).map(([baseName, groupJobs]) => ({ baseName, jobs: groupJobs }))
}

function JobGroupsList({ groups, selectedJobId, onSelect }: { groups: JobGroup[]; selectedJobId: number | null; onSelect: (id: number) => void }) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const toggle = (name: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }
  return (
    <div className="space-y-2">
      {groups.map(g => {
        const multiple = g.jobs.length > 1
        const isOpen = expandedGroups.has(g.baseName)
        const first = g.jobs[0]
        // Aggregate status: if any in_progress else if any failure else conclusion of first
        const aggregate = g.jobs.some(j => j.status === 'in_progress') ? 'in_progress' : (g.jobs.some(j => j.conclusion === 'failure') ? 'failure' : (first.conclusion || first.status))
        return (
          <div key={g.baseName} className="border border-gray-700 rounded" >
            <div className={`p-2 text-xs flex justify-between items-center ${multiple ? 'cursor-pointer hover:bg-gray-800' : ''}`} onClick={() => multiple ? toggle(g.baseName) : onSelect(first.id)}>
              <div className="flex items-center gap-2 min-w-0">
                {multiple && <span className="text-gray-500 text-[10px]">{isOpen ? '▼' : '▶'}</span>}
                <span className="truncate font-medium text-gray-200" title={g.baseName}>{g.baseName}{multiple && <span className="text-gray-500 ml-1">({g.jobs.length})</span>}</span>
              </div>
              <span className="text-gray-400 capitalize">{aggregate}</span>
            </div>
            { (multiple && isOpen) && (
              <div className="border-t border-gray-700">
                {g.jobs.map(job => (
                  <div key={job.id} className={`p-2 pl-5 text-xs border-b last:border-b-0 border-gray-800 ${selectedJobId===job.id ? 'bg-gray-800' : 'bg-gray-900 hover:bg-gray-800'} cursor-pointer`} onClick={() => onSelect(job.id)}>
                    <div className="flex justify-between">
                      <span className="truncate pr-2 font-medium text-gray-200" title={job.name}>{job.name}</span>
                      <span className="text-gray-400 capitalize">{job.conclusion || job.status}</span>
                    </div>
                    <div className="mt-1 flex gap-3 text-[10px] text-gray-500">
                      {job.started_at && <span>{relativeTime(job.started_at)}</span>}
                      {job.completed_at && job.started_at && <span>{formatDuration(new Date(job.completed_at).getTime() - new Date(job.started_at).getTime())}</span>}
                      {job.runner_name && <span>{job.runner_name}</span>}
                    </div>
                    {selectedJobId === job.id && job.steps && (
                      <div className="mt-2 border-t border-gray-700 pt-2 space-y-1">
                        {job.steps.map((s: Step) => (
                          <div key={s.number} className="flex justify-between text-gray-300">
                            <span className="truncate pr-2">{s.name}</span>
                            <span className="text-gray-500 capitalize">{s.conclusion || s.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {(!multiple) && selectedJobId === first.id && first.steps && (
              <div className="border-t border-gray-700 pt-2 space-y-1 p-2">
                {first.steps.map((s: Step) => (
                  <div key={s.number} className="flex justify-between text-gray-300">
                    <span className="truncate pr-2">{s.name}</span>
                    <span className="text-gray-500 capitalize">{s.conclusion || s.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Extracted body to reduce complexity of JobDrawer
function JobDrawerContent(props: {
  jobsState: FetchState<JobExtended[]>
  jobGroups: JobGroup[]
  selectedJobId: number | null
  openJob: (id: number) => void
}) {
  const { jobsState, jobGroups, selectedJobId, openJob } = props
  return (
    <>
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {jobsState.loading && <div className="text-gray-400 text-sm">Loading jobs...</div>}
        {jobsState.error && <div className="text-red-400 text-sm">{jobsState.error}</div>}
        {jobsState.data && (
          <JobGroupsList groups={jobGroups} selectedJobId={selectedJobId} onSelect={openJob} />
        )}
      </div>
      <div className="px-4 py-2 border-t border-gray-700 text-[10px] text-gray-500 flex justify-between items-center">
        <div>Select a job to view logs</div>
      </div>
    </>
  )
}

export function JobDrawer({ runId, onClose, owner, repo }: Props) {
  const [jobsState, setJobsState] = useState<FetchState<JobExtended[]>>({ data: null, loading: true })
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null)
  const [showLogModal, setShowLogModal] = useState(false)

  const fetchJobs = useCallback(async () => {
    setJobsState(prev => ({ ...prev, loading: true }))
    try {
      const res = await fetch(`/api/repos/${owner}/${repo}/actions/${runId}/jobs`)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setJobsState({ data: data.jobs || [], loading: false })
    } catch {
      setJobsState({ data: null, loading: false, error: 'Failed to load jobs' })
    }
  }, [owner, repo, runId])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const jobGroups = jobsState.data ? buildJobGroups(jobsState.data) : []

  const openJob = (jid: number) => {
    setSelectedJobId(jid)
    setShowLogModal(true)
  }
  const closeLogModal = () => {
    setShowLogModal(false)
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[520px] md:w-[620px] lg:w-[760px] bg-gray-900 border-l border-gray-700 z-40 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 gap-2">
        <h2 className="text-sm font-semibold text-white">Run #{runId} Jobs</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-lg">✕</button>
      </div>
      <JobDrawerContent
        jobsState={jobsState}
        jobGroups={jobGroups}
        selectedJobId={selectedJobId}
        openJob={openJob}
      />
      {showLogModal && selectedJobId && jobsState.data && (() => {
        const selectedJob = jobsState.data.find(j => j.id === selectedJobId)
        return selectedJob ? (
          <JobLogModal
            job={selectedJob}
            owner={owner}
            repo={repo}
            onClose={closeLogModal}
          />
        ) : null
      })()}
    </div>
  )
}
