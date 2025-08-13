import React from 'react'

interface Props { status: string; conclusion: string | null; className?: string }

export function StatusIcon({ status, conclusion, className = '' }: Props) {
  const { color, label } = mapStatus(status, conclusion)
  return (
    <span className={`inline-flex items-center ${className}`} title={label}>
      <span className={`w-2 h-2 rounded-full mr-1 ${color}`}></span>
      <span className="text-xs text-muted-foreground capitalize">{label}</span>
    </span>
  )
}

function mapStatus(status: string, conclusion: string | null): { color: string; label: string } {
  if (status === 'completed') {
    switch (conclusion) {
      case 'success': return { color: 'bg-green-500', label: 'success' }
      case 'failure': return { color: 'bg-destructive', label: 'failure' }
      case 'cancelled': return { color: 'bg-muted-foreground', label: 'cancelled' }
      case 'skipped': return { color: 'bg-muted-foreground', label: 'skipped' }
      default: return { color: 'bg-muted-foreground', label: conclusion || 'completed' }
    }
  }
  if (status === 'in_progress') return { color: 'bg-yellow-400 animate-pulse', label: 'in progress' }
  if (status === 'queued') return { color: 'bg-yellow-300', label: 'queued' }
  return { color: 'bg-muted-foreground', label: status }
}
