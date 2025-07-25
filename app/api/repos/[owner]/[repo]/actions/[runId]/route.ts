import { getOctokit } from '@/app/lib/octokit'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string; runId: string }> }
) {
  try {
    const { owner, repo, runId } = await params
    const octokit = await getOctokit()
    
    if (!octokit) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const response = await octokit.request('POST /repos/{owner}/{repo}/actions/runs/{run_id}/rerun', {
      owner,
      repo,
      run_id: parseInt(runId),
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error rerunning workflow:', error)
    return NextResponse.json({ 
      error: error.response?.data?.message || 'Failed to rerun workflow' 
    }, { status: error.status || 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string; runId: string }> }
) {
  try {
    const { owner, repo, runId } = await params
    const { searchParams } = new URL(request.url)
    const offset = parseInt(searchParams.get('offset') || '0')
    
    const octokit = await getOctokit()
    
    if (!octokit) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get workflow run logs
    const response = await octokit.request('GET /repos/{owner}/{repo}/actions/runs/{run_id}/logs', {
      owner,
      repo,
      run_id: parseInt(runId),
    })

    // GitHub returns a redirect URL for logs, we need to fetch the actual content
    const logsResponse = await fetch(response.url)
    const logsText = await logsResponse.text()

    // Apply offset for incremental updates
    const newContent = logsText.slice(offset)
    const totalLength = logsText.length

    return NextResponse.json({
      content: newContent,
      totalLength,
      hasMore: newContent.length > 0,
    })
  } catch (error: any) {
    console.error('Error fetching logs:', error)
    return NextResponse.json({ 
      error: error.response?.data?.message || 'Failed to fetch logs' 
    }, { status: error.status || 500 })
  }
}