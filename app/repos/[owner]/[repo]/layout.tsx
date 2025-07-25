import Link from 'next/link'
import { getOctokit } from '@/app/lib/octokit'

interface Repository {
  name: string
  full_name: string
  description: string | null
  default_branch: string
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
    { name: 'Code', href: `/repos/${owner}/${repo}/code` },
    { name: 'Pull Requests', href: `/repos/${owner}/${repo}/pulls` },
    { name: 'Actions', href: `/repos/${owner}/${repo}/actions` },
  ]

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="border-b border-gray-700 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="flex items-center space-x-2 text-xl">
              <Link
                href="/"
                className="text-blue-400 hover:underline"
              >
                ← Back
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-blue-400">{owner}</span>
              <span className="text-gray-400">/</span>
              <span className="text-white font-semibold">{repo}</span>
            </div>
            {repository?.description && (
              <p className="text-gray-400 mt-2">{repository.description}</p>
            )}
          </div>
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <Link
                key={tab.name}
                href={tab.href}
                className="py-4 px-1 border-b-2 border-transparent text-gray-400 hover:text-white hover:border-gray-300 transition-colors"
              >
                {tab.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <main>{children}</main>
    </div>
  )
}