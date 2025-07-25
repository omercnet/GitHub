import { getOctokit } from '@/app/lib/octokit'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const octokit = await getOctokit()
    
    if (!octokit) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const response = await octokit.request('GET /user/repos', {
      sort: 'updated',
      per_page: 100,
    })

    return NextResponse.json(response.data)
  } catch (error) {
    console.error('Error fetching repositories:', error)
    return NextResponse.json({ error: 'Failed to fetch repositories' }, { status: 500 })
  }
}