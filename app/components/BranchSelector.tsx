'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, GitBranch } from 'lucide-react'

interface Branch {
  name: string
  protected: boolean
  commit: {
    sha: string
    url: string
  }
}

interface BranchSelectorProps {
  owner: string
  repo: string
  currentBranch: string
  onBranchChange: (branch: string) => void
}

export default function BranchSelector({ 
  owner, 
  repo, 
  currentBranch, 
  onBranchChange 
}: BranchSelectorProps) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchBranches = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/repos/${owner}/${repo}/branches`)
        if (response.ok) {
          const data = await response.json()
          setBranches(data.branches || [])
        }
      } catch (error) {
        console.error('Error fetching branches:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBranches()
  }, [owner, repo])

  const handleBranchSelect = (branchName: string) => {
    onBranchChange(branchName)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-700 rounded-md bg-gray-800 hover:bg-gray-700 transition-colors"
        disabled={isLoading}
      >
        <GitBranch size={16} className="text-gray-400" />
        <span className="text-gray-200">
          {isLoading ? 'Loading...' : currentBranch}
        </span>
        <ChevronDown 
          size={16} 
          className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10 max-h-64 overflow-y-auto">
          <div className="p-2">
            <div className="text-xs text-gray-400 mb-2 flex items-center gap-2">
              <GitBranch size={12} />
              Switch branches/tags
            </div>
            {branches.map((branch) => (
              <button
                key={branch.name}
                onClick={() => handleBranchSelect(branch.name)}
                className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-700 transition-colors ${
                  branch.name === currentBranch 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{branch.name}</span>
                  {branch.protected && (
                    <span className="text-xs text-yellow-400">Protected</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
