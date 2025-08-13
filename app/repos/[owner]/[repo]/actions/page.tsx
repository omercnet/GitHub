'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { RunsFilterBar } from './components/RunsFilterBar'
import { SidebarWorkflows } from './components/SidebarWorkflows'
import { RunsList } from './components/RunsList'
import { WorkflowRunExtended, WorkflowFilters } from '@/app/lib/actions-types'
import { buildFiltersQuery } from '@/app/lib/actions-utils'

interface Branch { name: string; commit: { sha: string } }

export default function ActionsPage() {
  const params = useParams()
  const [branches, setBranches] = useState<Branch[]>([])
  const [expandedRuns, setExpandedRuns] = useState<Set<number>>(new Set())
  const [filters, setFilters] = useState<WorkflowFilters>({ page: 1, per_page: 20 })
  const [enrichedRuns, setEnrichedRuns] = useState<WorkflowRunExtended[]>([])
  const [isLoadingRuns, setIsLoadingRuns] = useState(false)
  const [workflowsMeta, setWorkflowsMeta] = useState<{ id: number; name: string; lastConclusion?: string }[]>([])

  const fetchBranches = useCallback(async () => {
    try {
      const response = await fetch(`/api/repos/${params.owner}/${params.repo}/branches`)
      if (response.ok) {
        const data = await response.json()
        setBranches(data.branches || [])
      }
    } catch {/* noop */}
  }, [params.owner, params.repo])

  const fetchEnrichedRuns = useCallback(async () => {
    setIsLoadingRuns(true)
    try {
      const qs = buildFiltersQuery(filters)
      const response = await fetch(`/api/repos/${params.owner}/${params.repo}/actions${qs}`)
      if (response.ok) {
        const data = await response.json()
        setEnrichedRuns(data.runs || data.workflow_runs || [])
      }
    } catch {/* noop */} finally { setIsLoadingRuns(false) }
  }, [filters, params.owner, params.repo])

  const fetchWorkflowsMeta = useCallback(async () => {
    try {
      const response = await fetch(`/api/repos/${params.owner}/${params.repo}/workflows`)
      if (response.ok) {
        const data = await response.json()
        const wf = (data.workflows || []).map((w: { id: number; name: string; state: string }) => ({ id: w.id, name: w.name, lastConclusion: w.state === 'active' ? undefined : w.state }))
        setWorkflowsMeta(wf)
      }
    } catch {/* noop */}
  }, [params.owner, params.repo])

  useEffect(() => { fetchBranches() }, [fetchBranches])
  useEffect(() => { fetchEnrichedRuns() }, [fetchEnrichedRuns])
  useEffect(() => { fetchWorkflowsMeta() }, [fetchWorkflowsMeta])

  const toggleRunExpansion = (runId: number) => {
    setExpandedRuns(prev => {
      const next = new Set(prev)
      if (next.has(runId)) {
        next.delete(runId)
      } else {
        next.add(runId)
      }
      return next
    })
  }

  const handleRunAction = async (run: WorkflowRunExtended, action: 'rerun' | 'rerun-failed' | 'cancel' | 'download') => {
    if (action === 'download') {
      try {
        const res = await fetch(`/api/repos/${params.owner}/${params.repo}/actions/${run.id}`)
        if (res.ok) {
          const data = await res.json()
          if (data.downloadUrl) {
            window.open(data.downloadUrl, '_blank')
          }
        }
      } catch {/* noop */}
      return
    }
    try {
      await fetch(`/api/repos/${params.owner}/${params.repo}/actions/${run.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action })
      })
      fetchEnrichedRuns()
    } catch {/* noop */}
  }

  const onSelectWorkflow = (id?: number) => setFilters(prev => ({ ...prev, workflow_id: id, page: 1 }))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Actions</h1>
        <button onClick={() => fetchEnrichedRuns()} className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md transition-colors">Refresh</button>
      </div>
      <div className="flex gap-6">
        <SidebarWorkflows workflows={workflowsMeta} activeWorkflowId={filters.workflow_id} onSelect={onSelectWorkflow} />
        <div className="flex-1">
          <RunsFilterBar filters={filters} onChange={patch => setFilters(f => ({ ...f, ...patch }))} branches={branches.map(b => b.name)} workflows={workflowsMeta} />
          <div className="bg-card rounded-lg overflow-hidden">
            <RunsList runs={enrichedRuns} onExpand={toggleRunExpansion} expanded={expandedRuns} onAction={handleRunAction} loading={isLoadingRuns} owner={params.owner as string} repo={params.repo as string} />
          </div>
        </div>
      </div>
    </div>
  )
}