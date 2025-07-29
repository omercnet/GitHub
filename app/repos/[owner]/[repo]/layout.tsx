import Link from 'next/link'
import { getOctokit } from '@/app/lib/octokit'
import { ArrowLeft, Star, GitFork, Eye, Code, GitPullRequest, Zap } from 'lucide-react'

interface Repository {
  name: string
  full_name: string
  description: string | null
  default_branch: string
  stargazers_count: number
  forks_count: number
  watchers_count: number
  language: string | null
  topics?: string[]
  visibility?: string
}

export default async function RepoLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ owner: string; repo: string }>
}) {
  const { owner, repo } = await params
  
  const octokit = await getOctokit()
  let repository: Repository | null = null

  if (octokit) {
    try {
      const response = await octokit.request('GET /repos/{owner}/{repo}', {
        owner,
        repo,
      })
      repository = response.data
    } catch (error) {
      console.error('Failed to fetch repository:', error)
    }
  }

  const tabs = [
    { name: 'Code', href: `/repos/${owner}/${repo}/code`, icon: Code },
    { name: 'Pull Requests', href: `/repos/${owner}/${repo}/pulls`, icon: GitPullRequest },
    { name: 'Actions', href: `/repos/${owner}/${repo}/actions`, icon: Zap },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent"></div>
      
      {/* Header */}
      <div className="relative border-b border-gray-700/50 bg-gray-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            {/* Breadcrumb */}
            <div className="flex items-center space-x-2 text-lg mb-4">
              <Link
                href="/"
                className="text-gray-400 hover:text-blue-400 transition-colors flex items-center space-x-2 group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span>Back to Organizations</span>
              </Link>
            </div>
            
            {/* Repository Info */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 text-2xl mb-2">
                  <span className="text-blue-400 font-medium">{owner}</span>
                  <span className="text-gray-500">/</span>
                  <span className="text-white font-bold">{repo}</span>
                  {repository?.visibility && (
                    <span className={`px-2 py-1 text-xs rounded-full border ${
                      repository.visibility === 'private' 
                        ? 'border-orange-500/30 text-orange-400 bg-orange-500/10' 
                        : 'border-green-500/30 text-green-400 bg-green-500/10'
                    }`}>
                      {repository.visibility}
                    </span>
                  )}
                </div>
                
                {repository?.description && (
                  <p className="text-gray-300 text-lg mb-3 max-w-3xl">{repository.description}</p>
                )}
                
                {/* Topics */}
                {repository?.topics && repository.topics.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {repository.topics.map((topic) => (
                      <span
                        key={topic}
                        className="px-3 py-1 text-xs rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-colors cursor-pointer"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Repository Stats */}
              {repository && (
                <div className="flex items-center space-x-6 text-sm">
                  {repository.language && (
                    <div className="flex items-center space-x-2 text-gray-300">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span>{repository.language}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-1 text-gray-300 hover:text-white transition-colors cursor-pointer">
                    <Star className="w-4 h-4" />
                    <span>{repository.stargazers_count.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center space-x-1 text-gray-300 hover:text-white transition-colors cursor-pointer">
                    <GitFork className="w-4 h-4" />
                    <span>{repository.forks_count.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center space-x-1 text-gray-300 hover:text-white transition-colors cursor-pointer">
                    <Eye className="w-4 h-4" />
                    <span>{repository.watchers_count.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <nav className="flex space-x-0 border-b border-gray-700/30">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <Link
                  key={tab.name}
                  href={tab.href}
                  className="flex items-center space-x-2 py-4 px-6 border-b-2 border-transparent text-gray-400 hover:text-white hover:border-blue-400/50 transition-all duration-200 group"
                >
                  <Icon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="font-medium">{tab.name}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
      
      {/* Main Content */}
      <main className="relative">{children}</main>
    </div>
  )
}