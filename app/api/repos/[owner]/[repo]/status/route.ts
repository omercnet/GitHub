import { getOctokit } from '@/app/lib/octokit'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  try {
    const { owner, repo } = await params
    const { searchParams } = new URL(request.url)
    const ref = searchParams.get('ref')
    
    if (!ref) {
      return NextResponse.json({ error: 'ref parameter is required' }, { status: 400 })
    }

    const octokit = await getOctokit()
    
    if (!octokit) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get both commit status and check runs
    const [statusResponse, checkRunsResponse] = await Promise.all([
      octokit.request('GET /repos/{owner}/{repo}/commits/{ref}/status', {
        owner,
        repo,
        ref,
      }).catch(() => ({ data: { state: 'pending', statuses: [] } })),
      octokit.request('GET /repos/{owner}/{repo}/commits/{ref}/check-runs', {
        owner,
        repo,
        ref,
      }).catch(() => ({ data: { check_runs: [] } }))
    ])

    return NextResponse.json({
      status: statusResponse.data,
      check_runs: checkRunsResponse.data.check_runs,
    })
  } catch (error) {
    console.error('Error fetching status:', error)
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 })
  }
}