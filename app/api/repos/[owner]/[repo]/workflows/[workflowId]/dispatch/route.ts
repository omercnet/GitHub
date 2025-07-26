import { getOctokit } from '@/app/lib/octokit'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string; workflowId: string }> }
) {
  try {
    const { owner, repo, workflowId } = await params
    const octokit = await getOctokit()
    
    if (!octokit) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { ref = 'main', inputs = {} } = body

    // Dispatch the workflow
    await octokit.request('POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches', {
      owner,
      repo,
      workflow_id: workflowId,
      ref,
      inputs,
    })

    return NextResponse.json({ success: true, message: 'Workflow dispatched successfully' })
  } catch (error: any) {
    // Handle specific GitHub API errors
    if (error.status === 422) {
      return NextResponse.json(
        { error: 'Invalid input parameters or workflow not found' },
        { status: 422 }
      )
    }
    
    if (error.status === 404) {
      return NextResponse.json(
        { error: 'Workflow not found or repository does not exist' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to dispatch workflow' },
      { status: 500 }
    )
  }
}