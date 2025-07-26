import { getOctokit } from '@/app/lib/octokit'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string; jobId: string }> }
) {
  try {
    const { owner, repo, jobId } = await params
    const { searchParams } = new URL(request.url)
    const offset = parseInt(searchParams.get('offset') || '0')
    
    const octokit = await getOctokit()
    
    if (!octokit) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get job logs
    const response = await octokit.request('GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs', {
      owner,
      repo,
      job_id: parseInt(jobId),
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
    console.error('Error fetching job logs:', error)
    return NextResponse.json({ 
      error: error.response?.data?.message || 'Failed to fetch job logs' 
    }, { status: error.status || 500 })
  }
}