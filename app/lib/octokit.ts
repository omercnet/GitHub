import { Octokit } from '@octokit/core'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { SessionData, sessionOptions } from './session'

export async function getOctokit(): Promise<Octokit | null> {
  // For integration testing purposes only - bypass authentication when in test mode
  if (process.env.NODE_ENV === 'test' && process.env.BYPASS_AUTH_FOR_TESTING === 'true') {
    // Return an unauthenticated Octokit client for testing public repositories
    return new Octokit()
  }

  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  
  if (!session.token) {
    return null
  }

  return new Octokit({
    auth: session.token,
  })
}

export function createOctokit(token: string): Octokit {
  return new Octokit({
    auth: token,
  })
}