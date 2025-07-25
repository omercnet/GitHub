import { Octokit } from '@octokit/core'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { SessionData, sessionOptions } from './session'

export async function getOctokit(): Promise<Octokit | null> {
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