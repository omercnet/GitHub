import { getOctokit } from '@/app/lib/octokit'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  try {
    const { owner, repo } = await params
    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path') || ''

    const octokit = await getOctokit()
    
    if (!octokit) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const response = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
      owner,
      repo,
      path,
    })

    return NextResponse.json(response.data)
  } catch (error: any) {
    console.error('Error fetching contents:', error)
    if (error.status === 404) {
      return NextResponse.json({ error: 'File or directory not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to fetch contents' }, { status: 500 })
  }
}