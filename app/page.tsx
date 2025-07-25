'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Repository {
  id: number
  name: string
  full_name: string
  owner: {
    login: string
  }
}

export default function Home() {
  const [token, setToken] = useState('')
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [selectedRepo, setSelectedRepo] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
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
        await fetchRepositories()
      } else {
        const error = await response.json()
        alert(error.error || 'Login failed')
      }
    } catch (error) {
      alert('Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchRepositories = async () => {
    try {
      const response = await fetch('/api/repos')
      if (response.ok) {
        const repos = await response.json()
        setRepositories(repos)
      }
    } catch (error) {
      console.error('Failed to fetch repositories:', error)
    }
  }

  const handleRepoSelect = (repoFullName: string) => {
    const [owner, repo] = repoFullName.split('/')
    router.push(`/repos/${owner}/${repo}/code`)
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">
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
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ghp_..."
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          <p className="text-sm text-gray-400 mt-4 text-center">
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
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">
          Select Repository
        </h1>
        {repositories.length > 0 ? (
          <div className="space-y-2">
            {repositories.map((repo) => (
              <button
                key={repo.id}
                onClick={() => handleRepoSelect(repo.full_name)}
                className="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
              >
                <div className="text-white font-medium">{repo.name}</div>
                <div className="text-gray-400 text-sm">{repo.full_name}</div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-gray-400 text-center">Loading repositories...</div>
        )}
      </div>
    </div>
  )
}