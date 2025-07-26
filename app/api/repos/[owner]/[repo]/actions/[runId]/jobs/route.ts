import { getOctokit } from '@/app/lib/octokit'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string; runId: string }> }
) {
  try {
    const { owner, repo, runId } = await params
    const octokit = await getOctokit()
    
    if (!octokit) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const response = await octokit.request('GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs', {
      owner,
      repo,
      run_id: parseInt(runId),
    })

    return NextResponse.json(response.data)
  } catch (error: any) {
    console.error('Error fetching workflow jobs:', error)
    return NextResponse.json({ 
      error: error.response?.data?.message || 'Failed to fetch workflow jobs' 
    }, { status: error.status || 500 })
  }
}