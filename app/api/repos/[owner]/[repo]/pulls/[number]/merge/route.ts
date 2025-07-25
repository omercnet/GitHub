import { getOctokit } from '@/app/lib/octokit'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string; number: string }> }
) {
  try {
    const { owner, repo, number } = await params
    const { commit_title, commit_message, merge_method } = await request.json()
    
    const octokit = await getOctokit()
    
    if (!octokit) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const response = await octokit.request('PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge', {
      owner,
      repo,
      pull_number: parseInt(number),
      commit_title,
      commit_message,
      merge_method: merge_method || 'merge',
    })

    return NextResponse.json(response.data)
  } catch (error: any) {
    console.error('Error merging pull request:', error)
    return NextResponse.json({ 
      error: error.response?.data?.message || 'Failed to merge pull request' 
    }, { status: error.status || 500 })
  }
}