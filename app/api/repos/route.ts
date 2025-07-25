import { getOctokit } from '@/app/lib/octokit'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const octokit = await getOctokit()
    
    if (!octokit) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const org = searchParams.get('org')
    const isPersonal = searchParams.get('isPersonal') === 'true'

    let response
    
    if (isPersonal) {
      // Fetch user's personal repositories
      response = await octokit.request('GET /user/repos', {
        affiliation: 'owner',
        sort: 'updated',
        per_page: 100,
      })
    } else if (org) {
      // Fetch organization repositories
      response = await octokit.request('GET /orgs/{org}/repos', {
        org,
        sort: 'updated',
        per_page: 100,
      })
    } else {
      // Fallback to all repositories (backward compatibility)
      response = await octokit.request('GET /user/repos', {
        sort: 'updated',
        per_page: 100,
      })
    }

    return NextResponse.json(response.data)
  } catch (error) {
    console.error('Error fetching repositories:', error)
    return NextResponse.json({ error: 'Failed to fetch repositories' }, { status: 500 })
  }
}