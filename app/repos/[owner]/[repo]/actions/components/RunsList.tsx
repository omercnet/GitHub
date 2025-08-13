'use client'
import React from 'react'
import { WorkflowRunExtended } from '@/app/lib/actions-types'
import { StatusIcon } from './StatusIcon'
import { formatDuration, relativeTime } from '@/app/lib/actions-utils'
import Image from 'next/image'
import JobLogModal from './JobLogModal'

interface Props {
  runs: WorkflowRunExtended[]
  onExpand: (runId: number) => void
  expanded: Set<number>
  onSelectRun?: (run: WorkflowRunExtended) => void
  onAction: (run: WorkflowRunExtended, action: 'rerun' | 'rerun-failed' | 'cancel' | 'download') => void
  loading?: boolean
  owner: string
  repo: string
}

export function RunsList({ runs, onExpand, expanded, onAction, loading, owner, repo }: Props) {
  if (loading) return <div className="p-6 text-muted-foreground">Loading...</div>
  if (!runs.length) return <div className="p-6 text-muted-foreground">No runs</div>
  return (
    <div className="divide-y divide-border">
      {runs.map(r => (
        <div key={r.id} className="hover:bg-muted/50 transition">
          <div 
            className="p-4 cursor-pointer"
            onClick={() => onExpand(r.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 min-w-0">
                <span className="text-muted-foreground mt-1 text-sm select-none">{expanded.has(r.id) ? '▼' : '▶'}</span>
                <div className="flex items-center gap-2 min-w-0">
                  <StatusIcon status={r.status} conclusion={r.conclusion} />
                  <span className="text-sm font-medium text-accent truncate max-w-[240px]" title={r.name}>{r.name}</span>
                  <span className="text-xs text-muted-foreground">#{r.run_number}</span>
                  <span className="text-xs bg-muted rounded px-1 capitalize">{r.event}</span>
                </div>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <RunActions run={r} onAction={onAction} />
              </div>
            </div>
            <div className="ml-6 mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>{r.head_branch}</span>
              <span>{r.head_sha.slice(0,7)}</span>
              {r.duration_ms !== undefined && <span>{formatDuration(r.duration_ms)}</span>}
              <span>{relativeTime(r.created_at)}</span>
              {r.actor && (
                <span className="inline-flex items-center gap-1">
                  <Image src={r.actor.avatar_url} alt={r.actor.login} width={16} height={16} className="rounded-full" />
                  {r.actor.login}
                </span>
              )}
              <a 
                href={r.html_url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-accent hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                View on GitHub ↗
              </a>
            </div>
            <div className="ml-6 mt-1 text-xs text-muted-foreground select-none">
              Click to {expanded.has(r.id) ? 'collapse' : 'expand'} jobs
            </div>
          </div>
          {expanded.has(r.id) && (
            <div className="mt-4 ml-6 text-xs text-card-foreground flex flex-col gap-1">
              {/* Jobs summary UI */}
              <JobsSummary runId={r.id} owner={owner} repo={repo} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function RunActions({ run, onAction }: { run: WorkflowRunExtended; onAction: (run: WorkflowRunExtended, action: 'rerun' | 'rerun-failed' | 'cancel' | 'download') => void }) {
  return (
    <div className="flex gap-2">
      <ActionButton label="Re-run" onClick={() => onAction(run, 'rerun')} />
      <ActionButton label="Failed" onClick={() => onAction(run, 'rerun-failed')} />
      <ActionButton label="Cancel" onClick={() => onAction(run, 'cancel')} disabled={run.status !== 'in_progress' && run.status !== 'queued'} />
      <ActionButton label="Logs" onClick={() => onAction(run, 'download')} />
    </div>
  )
}

function ActionButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return <button disabled={disabled} onClick={onClick} className={`text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed`}>{label}</button>
}

// Inline jobs list for expanded run - replaces the separate JobDrawer
interface JobSummary {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  duration_ms?: number;
}

function JobsSummary({ runId, owner, repo }: { runId: number; owner: string; repo: string }) {
  const [jobs, setJobs] = React.useState<JobSummary[]|null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string|null>(null)
  const [selectedJobId, setSelectedJobId] = React.useState<number | null>(null)

  React.useEffect(() => {
    let ignore = false
    setLoading(true)
    setError(null)
    fetch(`/api/repos/${owner}/${repo}/actions/${runId}/jobs`).then(async r => {
      if (!r.ok) {
        const text = await r.text()
        if (!ignore) setError(`API error: ${r.status} ${text}`)
        return
      }
      const d = await r.json()
      if (!ignore) setJobs((d.jobs||[]).map((j: {
        id: number;
        name: string;
        status: string;
        conclusion: string | null;
        started_at?: string | null;
        completed_at?: string | null;
      }) => ({
        id: j.id,
        name: j.name,
        status: j.status,
        conclusion: j.conclusion,
        started_at: j.started_at,
        completed_at: j.completed_at,
        duration_ms: j.started_at && j.completed_at 
          ? new Date(j.completed_at).getTime() - new Date(j.started_at).getTime()
          : undefined
      })))
    }).catch(e => {
      if (!ignore) setError(`Fetch error: ${e.message}`)
    }).finally(()=>{ if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [runId, owner, repo])

  if (loading) return <div className="text-muted-foreground">Loading jobs…</div>
  if (error) return <div className="text-destructive">{error}</div>
  if (!jobs) return null
  if (!jobs.length) return <div className="text-muted-foreground">No jobs</div>

  const failed = jobs.filter(j=>j.conclusion==='failure').length
  const inProgress = jobs.filter(j=>j.status==='in_progress').length

  return (
    <div className="bg-card/50 rounded-lg p-3 mt-2">
      {/* Summary bar */}
      <div className="flex items-center gap-2 mb-3 text-xs">
        <span className="text-muted-foreground">{jobs.length} job{jobs.length !== 1 ? 's' : ''}</span>
        {failed > 0 && <span className="bg-destructive/60 text-destructive-foreground rounded px-2 py-0.5">{failed} failed</span>}
        {inProgress > 0 && <span className="bg-primary/60 text-primary-foreground rounded px-2 py-1">{inProgress} running</span>}
      </div>

      {/* Full jobs list */}
      <div className="space-y-1">
        {jobs.map(job => (
          <JobRow 
            key={job.id} 
            job={job} 
            runId={runId}
            owner={owner} 
            repo={repo}
            isSelected={selectedJobId === job.id}
            onSelect={() => setSelectedJobId(job.id)}
          />
        ))}
      </div>
    </div>
  )
}

function JobRow({ job, runId, owner, repo, isSelected, onSelect }: {
  job: JobSummary;
  runId: number;
  owner: string;
  repo: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const [showLogModal, setShowLogModal] = React.useState(false)

  const getStatusColor = (status: string, conclusion: string | null) => {
    if (status === 'in_progress') return 'text-primary'
    if (status === 'queued') return 'text-yellow-400'
    if (conclusion === 'success') return 'text-green-400'
    if (conclusion === 'failure') return 'text-destructive'
    if (conclusion === 'cancelled') return 'text-muted-foreground'
    return 'text-muted-foreground'
  }

  const getStatusIcon = (status: string, conclusion: string | null) => {
    if (status === 'in_progress') return '🔵'
    if (status === 'queued') return '🟡'
    if (conclusion === 'success') return '✅'
    if (conclusion === 'failure') return '❌'
    if (conclusion === 'cancelled') return '🚫'
    return '⚪'
  }

  return (
    <>
      <div 
        className={`flex items-center justify-between p-2 rounded text-xs cursor-pointer transition-colors
          ${isSelected ? 'bg-primary/20 border border-primary/50' : 'hover:bg-muted/60'}`}
        onClick={onSelect}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-sm">{getStatusIcon(job.status, job.conclusion)}</span>
          <span className="font-medium text-card-foreground truncate" title={job.name}>
            {job.name}
          </span>
          <span className={`capitalize ${getStatusColor(job.status, job.conclusion)}`}>
            {job.conclusion || job.status}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {job.duration_ms && (
            <span className="text-muted-foreground">{formatDuration(job.duration_ms)}</span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowLogModal(true)
            }}
            className="text-accent hover:text-accent/80 underline"
          >
            Logs
          </button>
        </div>
      </div>

      {showLogModal && (
        <JobLogModal 
          job={{
            ...job,
            run_id: runId,
            html_url: '',
            steps: [],
            runner_name: undefined,
            runner_group_id: undefined,
            attempt: undefined,
            started_at: job.started_at || null,
            completed_at: job.completed_at || null,
          }}
          owner={owner}
          repo={repo}
          onClose={() => setShowLogModal(false)}
        />
      )}
    </>
  )
}
