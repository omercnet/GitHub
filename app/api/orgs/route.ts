import { getOctokit } from '@/app/lib/octokit'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const octokit = await getOctokit()
    
    if (!octokit) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Fetch user's organizations
    const orgsResponse = await octokit.request('GET /user/orgs', {
      per_page: 100,
    })

    // Fetch user information for personal repos
    const userResponse = await octokit.request('GET /user')

    // Create a list including personal repos as an "organization"
    const organizations = [
      {
        id: userResponse.data.id,
        login: userResponse.data.login,
        avatar_url: userResponse.data.avatar_url,
        name: userResponse.data.name || userResponse.data.login,
        isPersonal: true,
      },
      ...orgsResponse.data.map(org => ({
        id: org.id,
        login: org.login,
        avatar_url: org.avatar_url,
        name: org.description || org.login,
        isPersonal: false,
      }))
    ]

    return NextResponse.json(organizations)
  } catch (error) {
    console.error('Error fetching organizations:', error)
    return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 })
  }
}