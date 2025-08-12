'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Github, Key, Loader2, LogIn } from 'lucide-react'

interface Repository {
  id: number
  name: string
  full_name: string
  description?: string
  language?: string
  stargazers_count: number
  forks_count: number
  owner: {
    login: string
  }
}

interface Organization {
  id: number
  login: string
  avatar_url: string
  name: string
  isPersonal: boolean
}

export default function Home() {
  const [token, setToken] = useState('')
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loadingRepos, setLoadingRepos] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const router = useRouter()

  // Check for existing session on component mount
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const response = await fetch('/api/session')
        if (response.ok) {
          const data = await response.json()
          if (data.authenticated) {
            setIsLoggedIn(true)
            await fetchOrganizations()
          }
        }
      } catch (error) {
        console.warn('Failed to check existing session:', error)
      } finally {
        setCheckingSession(false)
      }
    }

    checkExistingSession()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      if (response.ok) {
        setIsLoggedIn(true)
        await fetchOrganizations()
      } else {
        const error = await response.json()
        alert(error.error || 'Login failed')
      }
    } catch {
      alert('Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/api/orgs')
      if (response.ok) {
        const orgs = await response.json()
        setOrganizations(orgs)
      }
    } catch (error) {
      console.warn('Failed to fetch organizations:', error)
    }
  }

  const fetchRepositories = async (org: Organization) => {
    setLoadingRepos(true)
    try {
      const params = new URLSearchParams()
      if (org.isPersonal) {
        params.append('isPersonal', 'true')
      } else {
        params.append('org', org.login)
      }
      
      const response = await fetch(`/api/repos?${params}`)
      if (response.ok) {
        const repos = await response.json()
        setRepositories(repos)
        setSelectedOrg(org)
      }
    } catch (error) {
      console.error('Failed to fetch repositories:', error)
    } finally {
      setLoadingRepos(false)
    }
  }

  const handleRepoSelect = (repoFullName: string) => {
    const [owner, repo] = repoFullName.split('/')
    router.push(`/repos/${owner}/${repo}/code`)
  }

  const handleBackToOrgs = () => {
    setSelectedOrg(null)
    setRepositories([])
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/session', { method: 'DELETE' })
      setIsLoggedIn(false)
      setOrganizations([])
      setRepositories([])
      setSelectedOrg(null)
      setToken('')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  // Show loading screen while checking for existing session
  if (checkingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    )
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="bg-card border-border shadow-2xl w-full max-w-md">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
              <Github className="w-8 h-8 text-background" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              GitHub UI Clone
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Connect with your GitHub account to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="token" className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Personal Access Token
                </label>
                <Input
                  type="password"
                  id="token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="bg-input border-border text-foreground placeholder-muted-foreground focus:border-ring focus:ring-ring/20"
                  placeholder="ghp_..."
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    Connect to GitHub
                  </>
                )}
              </Button>
            </form>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Need a token?</span>
              </div>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-4 border border-border">
              <p className="text-sm text-muted-foreground text-center">
                Generate your token at{' '}
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:text-accent/80 underline underline-offset-2 transition-colors"
                >
                  github.com/settings/tokens
                </a>
              </p>
              <div className="mt-3 text-xs text-muted-foreground space-y-1">
                <p>Required scopes: repo, user, read:org</p>
                <p>• Access public and private repositories</p>
                <p>• Read user profile and organization data</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent"></div>
      <Card className="relative bg-gray-900/80 backdrop-blur-sm border-gray-700/50 shadow-2xl w-full max-w-md">
        {!selectedOrg ? (
          <>
            <CardHeader className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-2">
                <Github className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Select Organization
              </CardTitle>
              <CardDescription className="text-gray-400">
                Choose an organization to view its repositories
              </CardDescription>
            </CardHeader>
            <CardContent>
              {organizations.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {organizations.map((org) => (
                      <button
                        key={org.id}
                        onClick={() => fetchRepositories(org)}
                        className="w-full text-left p-4 bg-gray-800/40 hover:bg-gray-700/60 rounded-lg transition-all duration-200 flex items-center space-x-3 border border-gray-700/30 hover:border-gray-600/50 group"
                      >
                        <div className="relative">
                          <Image
                            src={org.avatar_url}
                            alt={org.name}
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-full ring-2 ring-gray-600/50 group-hover:ring-blue-500/30 transition-all duration-200"
                          />
                          {org.isPersonal && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-semibold text-base truncate group-hover:text-blue-300 transition-colors">
                            {org.name}
                          </div>
                          <div className="text-gray-400 text-sm truncate">
                            {org.isPersonal ? 'Personal repositories' : `@${org.login}`}
                          </div>
                        </div>
                        <div className="text-gray-500 group-hover:text-gray-300 transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="mt-6 pt-4 border-t border-gray-700/30">
                    <Button
                      onClick={handleLogout}
                      variant="outline"
                      className="w-full bg-transparent border-gray-600 text-gray-400 hover:bg-red-900/20 hover:border-red-600 hover:text-red-400 transition-all duration-200"
                    >
                      Sign Out
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <div className="text-gray-400 text-sm">Loading organizations...</div>
                </div>
              )}
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <div className="flex items-center justify-between">
                <button
                  onClick={handleBackToOrgs}
                  className="text-gray-400 hover:text-white transition-colors flex items-center space-x-2 text-sm group"
                >
                  <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Back to Organizations</span>
                </button>
              </div>
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center space-x-3">
                  <Image
                    src={selectedOrg.avatar_url}
                    alt={selectedOrg.name}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full ring-2 ring-gray-600/50"
                  />
                  <div>
                    <CardTitle className="text-xl font-bold text-white">
                      {selectedOrg.name}
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      {selectedOrg.isPersonal ? 'Personal repositories' : `@${selectedOrg.login}`}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingRepos ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <div className="text-gray-400 text-sm">Loading repositories...</div>
                </div>
              ) : repositories.length > 0 ? (
                <div className="space-y-3">
                  {repositories.map((repo) => (
                    <button
                      key={repo.id}
                      onClick={() => handleRepoSelect(repo.full_name)}
                      className="w-full text-left p-4 bg-gray-800/40 hover:bg-gray-700/60 rounded-lg transition-all duration-200 border border-gray-700/30 hover:border-gray-600/50 group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-semibold text-base truncate group-hover:text-blue-300 transition-colors">
                            {repo.name}
                          </div>
                          <div className="text-gray-400 text-sm truncate mb-2">
                            {repo.full_name}
                          </div>
                          {repo.description && (
                            <div className="text-gray-500 text-sm line-clamp-2 mb-3">
                              {repo.description}
                            </div>
                          )}
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            {repo.language && (
                              <div className="flex items-center space-x-1">
                                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                <span>{repo.language}</span>
                              </div>
                            )}
                            {repo.stargazers_count > 0 && (
                              <div className="flex items-center space-x-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                <span>{repo.stargazers_count}</span>
                              </div>
                            )}
                            {repo.forks_count > 0 && (
                              <div className="flex items-center space-x-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414L2.586 7l3.707-3.707a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                <span>{repo.forks_count}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-gray-500 group-hover:text-gray-300 transition-colors ml-3">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
                    <Github className="w-6 h-6 text-gray-500" />
                  </div>
                  <div className="text-gray-400 text-sm">No repositories found</div>
                  <div className="text-gray-500 text-xs mt-1">This organization has no accessible repositories</div>
                </div>
              )}
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}