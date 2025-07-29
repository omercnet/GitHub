'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { GitPullRequest, Plus, CheckCircle, XCircle, Clock, AlertCircle, User, GitBranch, Calendar, X } from 'lucide-react'

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

  const fetchPullRequests = useCallback(async () => {
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
  }, [params.owner, params.repo])

  useEffect(() => {
    fetchPullRequests()
  }, [fetchPullRequests])

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
      case 'success': return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'failure': return <XCircle className="w-4 h-4 text-red-400" />
      case 'pending': return <Clock className="w-4 h-4 text-yellow-400" />
      case 'error': return <AlertCircle className="w-4 h-4 text-red-400" />
      default: return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusBadge = (state: string) => {
    switch (state) {
      case 'open': return <Badge variant="outline" className="border-green-500/30 text-green-400 bg-green-500/10">Open</Badge>
      case 'closed': return <Badge variant="outline" className="border-red-500/30 text-red-400 bg-red-500/10">Closed</Badge>
      case 'merged': return <Badge variant="outline" className="border-purple-500/30 text-purple-400 bg-purple-500/10">Merged</Badge>
      default: return <Badge variant="outline" className="border-gray-500/30 text-gray-400 bg-gray-500/10">{state}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <GitPullRequest className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Pull Requests
            </h1>
            <p className="text-gray-400">Manage code reviews and collaboration</p>
          </div>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Pull Request
        </Button>
      </div>

      {/* Create PR Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="bg-gray-900/95 border-gray-700/50 shadow-2xl w-full max-w-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                    <GitPullRequest className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-white">Create Pull Request</CardTitle>
                    <CardDescription className="text-gray-400">
                      Propose changes to the repository
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={createPullRequest} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Title
                  </label>
                  <Input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-500"
                    placeholder="Add a descriptive title..."
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                      <GitBranch className="w-3 h-3" />
                      Head Branch
                    </label>
                    <Input
                      type="text"
                      value={formData.head}
                      onChange={(e) => setFormData({ ...formData, head: e.target.value })}
                      placeholder="feature-branch"
                      className="bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-500 font-mono text-sm"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                      <GitBranch className="w-3 h-3" />
                      Base Branch
                    </label>
                    <Input
                      type="text"
                      value={formData.base}
                      onChange={(e) => setFormData({ ...formData, base: e.target.value })}
                      className="bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-500 font-mono text-sm"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Description
                  </label>
                  <textarea
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded-md text-white placeholder-gray-500 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-colors resize-none"
                    rows={4}
                    placeholder="Describe your changes..."
                  />
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                  >
                    <GitPullRequest className="w-4 h-4 mr-2" />
                    Create Pull Request
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                    className="border-gray-600/50 text-gray-300 hover:bg-gray-800/50"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
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
      <div className="space-y-6">
        {isLoading ? (
          <Card className="bg-gray-900/50 border-gray-700/50">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <div className="text-gray-400">Loading pull requests...</div>
            </CardContent>
          </Card>
        ) : pullRequests.length === 0 ? (
          <Card className="bg-gray-900/50 border-gray-700/50">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-6">
                <GitPullRequest className="w-8 h-8 text-gray-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-300 mb-2">No pull requests yet</h3>
              <p className="text-gray-500 mb-6">Get started by creating your first pull request</p>
              <Button 
                onClick={() => setShowCreateForm(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Pull Request
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pullRequests.map((pr) => (
              <Card key={pr.id} className="bg-gray-900/50 border-gray-700/50 hover:border-gray-600/50 transition-all duration-200 group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                          <GitPullRequest className="w-4 h-4 text-white" />
                        </div>
                        {getStatusBadge(pr.state)}
                        <div className="text-gray-400 text-sm">#{pr.number}</div>
                      </div>
                      
                      <h3 className="text-lg font-semibold text-white mb-3 group-hover:text-blue-300 transition-colors">
                        {pr.title}
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-4">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{pr.user.login}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>opened {formatDate(pr.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <GitBranch className="w-3 h-3" />
                          <span className="font-mono text-xs bg-gray-800 px-2 py-1 rounded">
                            {pr.head.ref}
                          </span>
                          <span className="mx-1">→</span>
                          <span className="font-mono text-xs bg-gray-800 px-2 py-1 rounded">
                            {pr.base.ref}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => viewChecks(pr)}
                        variant="outline"
                        size="sm"
                        className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/50"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        View Checks
                      </Button>
                      <Button
                        onClick={() => mergePullRequest(pr)}
                        disabled={pr.mergeable === false}
                        size="sm"
                        className={`${
                          pr.mergeable === false 
                            ? 'bg-gray-600 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
                        } transition-all duration-200`}
                      >
                        <GitPullRequest className="w-4 h-4 mr-2" />
                        Merge
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}