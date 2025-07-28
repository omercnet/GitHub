'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

interface PullRequest {
  id: number
  number: number
  title: string
  state: string
  user: {
    login: string
  }
  head: {
    ref: string
    sha: string
  }
  base: {
    ref: string
  }
  created_at: string
  mergeable: boolean | null
}

interface Status {
  state: string
  statuses: Array<{
    id: number
    state: string
    description: string
    context: string
  }>
}

interface CheckRun {
  id: number
  name: string
  status: string
  conclusion: string | null
}

export default function PullsPage() {
  const params = useParams()
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedPr, setSelectedPr] = useState<PullRequest | null>(null)
  const [status, setStatus] = useState<Status | null>(null)
  const [checkRuns, setCheckRuns] = useState<CheckRun[]>([])

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    head: '',
    base: 'main',
    body: '',
  })

  useEffect(() => {
    fetchPullRequests()
  }, [params.owner, params.repo])

  const fetchPullRequests = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/repos/${params.owner}/${params.repo}/pulls`)
      if (response.ok) {
        const data = await response.json()
        setPullRequests(data)
      }
    } catch (error) {
      console.error('Failed to fetch pull requests:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createPullRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch(`/api/repos/${params.owner}/${params.repo}/pulls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setShowCreateForm(false)
        setFormData({ title: '', head: '', base: 'main', body: '' })
        fetchPullRequests()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create pull request')
      }
    } catch {
      alert('Failed to create pull request')
    }
  }

  const mergePullRequest = async (pr: PullRequest) => {
    if (!confirm(`Are you sure you want to merge PR #${pr.number}?`)) {
      return
    }

    try {
      const response = await fetch(
        `/api/repos/${params.owner}/${params.repo}/pulls/${pr.number}/merge`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            commit_title: `Merge pull request #${pr.number} from ${pr.head.ref}`,
            commit_message: pr.title,
            merge_method: 'merge',
          }),
        }
      )

      if (response.ok) {
        fetchPullRequests()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to merge pull request')
      }
    } catch {
      alert('Failed to merge pull request')
    }
  }

  const viewChecks = async (pr: PullRequest) => {
    setSelectedPr(pr)
    try {
      const response = await fetch(
        `/api/repos/${params.owner}/${params.repo}/status?ref=${pr.head.sha}`
      )
      if (response.ok) {
        const data = await response.json()
        setStatus(data.status)
        setCheckRuns(data.check_runs)
      }
    } catch (error) {
      console.error('Failed to fetch checks:', error)
    }
  }

  const getStatusIcon = (state: string) => {
    switch (state) {
      case 'success': return '✅'
      case 'failure': return '❌'
      case 'pending': return '🟡'
      case 'error': return '❌'
      default: return '⚪'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Pull Requests</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors"
        >
          New Pull Request
        </button>
      </div>

      {/* Create PR Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Create Pull Request</h2>
            <form onSubmit={createPullRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Head Branch
                </label>
                <input
                  type="text"
                  value={formData.head}
                  onChange={(e) => setFormData({ ...formData, head: e.target.value })}
                  placeholder="feature-branch"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Base Branch
                </label>
                <input
                  type="text"
                  value={formData.base}
                  onChange={(e) => setFormData({ ...formData, base: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  rows={3}
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Modal */}
      {selectedPr && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-2xl max-h-96 overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">
                Status for PR #{selectedPr.number}
              </h2>
              <button
                onClick={() => setSelectedPr(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            {/* Commit Status */}
            {status && (
              <div className="mb-4">
                <h3 className="text-white font-medium mb-2">Commit Status</h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span>{getStatusIcon(status.state)}</span>
                    <span className="text-white">{status.state}</span>
                  </div>
                  {status.statuses.map((statusItem) => (
                    <div key={statusItem.id} className="flex items-center space-x-2 ml-4">
                      <span>{getStatusIcon(statusItem.state)}</span>
                      <span className="text-gray-300">{statusItem.context}</span>
                      <span className="text-gray-400">{statusItem.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Check Runs */}
            {checkRuns.length > 0 && (
              <div>
                <h3 className="text-white font-medium mb-2">Check Runs</h3>
                <div className="space-y-2">
                  {checkRuns.map((checkRun) => (
                    <div key={checkRun.id} className="flex items-center space-x-2">
                      <span>{getStatusIcon(checkRun.conclusion || checkRun.status)}</span>
                      <span className="text-gray-300">{checkRun.name}</span>
                      <span className="text-gray-400">
                        {checkRun.conclusion || checkRun.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pull Requests List */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : pullRequests.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No open pull requests</div>
        ) : (
          <div className="divide-y divide-gray-700">
            {pullRequests.map((pr) => (
              <div key={pr.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-white font-medium">{pr.title}</h3>
                    <div className="text-sm text-gray-400 mt-1">
                      #{pr.number} opened on {formatDate(pr.created_at)} by {pr.user.login}
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      {pr.head.ref} → {pr.base.ref}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => viewChecks(pr)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                    >
                      View Checks
                    </button>
                    <button
                      onClick={() => mergePullRequest(pr)}
                      disabled={pr.mergeable === false}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Merge
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}