import { getOctokit } from '@/app/lib/octokit'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  try {
    const { owner, repo } = await params
    const octokit = await getOctokit()
    
    if (!octokit) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const response = await octokit.request('GET /repos/{owner}/{repo}/actions/runs', {
      owner,
      repo,
      per_page: 50,
    })

    return NextResponse.json(response.data)
  } catch (error) {
    console.error('Error fetching workflow runs:', error)
    return NextResponse.json({ error: 'Failed to fetch workflow runs' }, { status: 500 })
  }
}