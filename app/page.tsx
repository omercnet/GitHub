'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface Repository {
  id: number
  name: string
  full_name: string
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
  const router = useRouter()

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
      console.error('Failed to fetch organizations:', error)
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

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 p-6 sm:p-8 rounded-lg shadow-lg w-full max-w-md">
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-6 text-center">
            GitHub UI Clone
          </h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-gray-300 mb-2">
                GitHub Personal Access Token
              </label>
              <input
                type="password"
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="ghp_..."
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium py-2 px-4 rounded-md transition-colors text-sm sm:text-base"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          <p className="text-xs sm:text-sm text-gray-400 mt-4 text-center">
            Generate a token at{' '}
            <a
              href="https://github.com/settings/tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              github.com/settings/tokens
            </a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 p-6 sm:p-8 rounded-lg shadow-lg w-full max-w-md">
        {!selectedOrg ? (
          <>
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-6 text-center">
              Select Organization
            </h1>
            {organizations.length > 0 ? (
              <div className="space-y-2">
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => fetchRepositories(org)}
                    className="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors flex items-center space-x-3"
                  >
                    <Image
                      src={org.avatar_url}
                      alt={org.name}
                      width={32}
                      height={32}
                      className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium text-sm sm:text-base truncate">
                        {org.name}
                      </div>
                      <div className="text-gray-400 text-xs sm:text-sm truncate">
                        {org.isPersonal ? 'Personal repositories' : `@${org.login}`}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-gray-400 text-center text-sm">Loading organizations...</div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={handleBackToOrgs}
                className="text-gray-400 hover:text-white transition-colors flex items-center space-x-1 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back</span>
              </button>
              <h1 className="text-lg sm:text-xl font-bold text-white text-center flex-1">
                {selectedOrg.name}
              </h1>
              <div className="w-12"></div> {/* Spacer for centering */}
            </div>
            
            {loadingRepos ? (
              <div className="text-gray-400 text-center text-sm">Loading repositories...</div>
            ) : repositories.length > 0 ? (
              <div className="space-y-2">
                {repositories.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => handleRepoSelect(repo.full_name)}
                    className="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                  >
                    <div className="text-white font-medium text-sm sm:text-base truncate">{repo.name}</div>
                    <div className="text-gray-400 text-xs sm:text-sm truncate">{repo.full_name}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-gray-400 text-center text-sm">No repositories found</div>
            )}
          </>
        )}
      </div>
    </div>
  )
}