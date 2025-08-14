'use client'
import React from 'react'

interface WorkflowMeta { id: number; name: string; lastConclusion?: string; lastDurationMs?: number }

interface Props {
  workflows: WorkflowMeta[]
  activeWorkflowId?: number
  onSelect: (id?: number) => void
}

export function SidebarWorkflows({ workflows, activeWorkflowId, onSelect }: Props) {
  return (
    <aside className="w-64 border-r border-border pr-4 hidden lg:block">
      <h2 className="text-sm font-semibold text-card-foreground mb-3">Workflows</h2>
      <ul className="space-y-1">
        <li>
          <button onClick={() => onSelect(undefined)} className={`w-full text-left px-2 py-1 rounded text-sm ${!activeWorkflowId ? 'bg-muted text-foreground' : 'hover:bg-muted text-muted-foreground'}`}>All workflows</button>
        </li>
        {workflows.map(w => (
          <li key={w.id}>
            <button onClick={() => onSelect(w.id)} className={`w-full text-left px-2 py-1 rounded text-sm flex justify-between items-center ${activeWorkflowId === w.id ? 'bg-muted text-foreground' : 'hover:bg-muted text-muted-foreground'}`}>
              <span className="truncate" title={w.name}>{w.name}</span>
              {w.lastConclusion && <span className="ml-2 text-xs text-muted-foreground capitalize">{w.lastConclusion}</span>}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
