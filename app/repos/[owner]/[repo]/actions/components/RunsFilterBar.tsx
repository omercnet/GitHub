'use client'
import React from 'react'
import { WorkflowFilters } from '@/app/lib/actions-types'

interface Props {
  filters: WorkflowFilters
  onChange: (patch: Partial<WorkflowFilters>) => void
  branches: string[]
  workflows: { id: number; name: string }[]
}

const statusOptions = ['success','failure','in_progress','queued','cancelled']
const eventOptions = ['push','pull_request','workflow_dispatch','schedule']

export function RunsFilterBar({ filters, onChange, branches, workflows }: Props) {
  return (
    <div className="flex flex-wrap gap-3 items-end mb-4">
      <Input label="Search" value={filters.search || ''} onChange={v => onChange({ search: v })} placeholder="Run, branch, SHA" />
      <Select label="Status" value={filters.status || ''} onChange={v => onChange({ status: v || undefined })} options={statusOptions} allowEmpty />
      <Select label="Event" value={filters.event || ''} onChange={v => onChange({ event: v || undefined })} options={eventOptions} allowEmpty />
      <Select label="Branch" value={filters.branch || ''} onChange={v => onChange({ branch: v || undefined })} options={branches} allowEmpty />
      <Select label="Workflow" value={filters.workflow_id ? String(filters.workflow_id) : ''} onChange={v => onChange({ workflow_id: v ? Number(v) : undefined })} options={workflows.map(w => ({ value: String(w.id), label: w.name }))} allowEmpty />
      <button onClick={() => onChange({ search: '', status: undefined, event: undefined, branch: undefined, workflow_id: undefined, page: 1 })} className="text-xs px-2 py-1 bg-muted hover:bg-muted/80 rounded">Clear</button>
    </div>
  )
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="flex flex-col text-xs text-card-foreground">
      <span className="mb-1">{label}</span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="bg-input border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
    </label>
  )
}

interface SelectProps { label: string; value: string; onChange: (v: string) => void; options: (string | { value: string; label: string })[]; allowEmpty?: boolean }
function Select({ label, value, onChange, options, allowEmpty }: SelectProps) {
  return (
    <label className="flex flex-col text-xs text-card-foreground min-w-[140px]">
      <span className="mb-1">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} className="bg-input border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
        {allowEmpty && <option value="">All</option>}
        {options.map(o => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}
