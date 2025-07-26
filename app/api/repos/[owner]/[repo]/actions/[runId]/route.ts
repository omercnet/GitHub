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
    const octokit = await getOctokit()
    
    if (!octokit) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get workflow run logs download URL
    const response = await octokit.request('GET /repos/{owner}/{repo}/actions/runs/{run_id}/logs', {
      owner,
      repo,
      run_id: parseInt(runId),
    })

    // Return the download URL for the zip file
    return NextResponse.json({
      downloadUrl: response.url,
    })
  } catch (error: any) {
    console.error('Error fetching log download URL:', error)
    return NextResponse.json({ 
      error: error.response?.data?.message || 'Failed to fetch log download URL' 
    }, { status: error.status || 500 })
  }
}