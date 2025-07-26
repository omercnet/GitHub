import { getOctokit } from '@/app/lib/octokit'
import { NextRequest, NextResponse } from 'next/server'
import * as yaml from 'js-yaml'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  try {
    const { owner, repo } = await params
    const octokit = await getOctokit()
    
    if (!octokit) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get all workflows
    const response = await octokit.request('GET /repos/{owner}/{repo}/actions/workflows', {
      owner,
      repo,
    })

    // Filter workflows that have workflow_dispatch trigger
    const manualWorkflows = []
    
    for (const workflow of response.data.workflows) {
      try {
        // Get workflow details to check for workflow_dispatch
        const workflowDetails = await octokit.request('GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}', {
          owner,
          repo,
          workflow_id: workflow.id,
        })
        
        // Check if workflow has workflow_dispatch trigger
        if (workflowDetails.data.badge_url && workflowDetails.data.path) {
          // Get the workflow content to check for workflow_dispatch
          const workflowContent = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner,
            repo,
            path: workflowDetails.data.path,
          })
          
          if ('content' in workflowContent.data) {
            const content = Buffer.from(workflowContent.data.content, 'base64').toString('utf-8')
            
            // Simple check for workflow_dispatch in the YAML content
            if (content.includes('workflow_dispatch')) {
              // Parse workflow_dispatch inputs if present
              const inputs = parseWorkflowInputs(content)
              manualWorkflows.push({
                ...workflowDetails.data,
                inputs
              })
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching workflow ${workflow.id}:`, error)
        // Continue with next workflow
      }
    }

    return NextResponse.json({ workflows: manualWorkflows })
  } catch (error) {
    console.error('Error fetching workflows:', error)
    return NextResponse.json({ error: 'Failed to fetch workflows' }, { status: 500 })
  }
}

interface WorkflowInput {
  description: string
  required: boolean
  type: 'string' | 'boolean' | 'choice'
  default?: string | boolean
  options?: string[]
}

function parseWorkflowInputs(yamlContent: string): Record<string, WorkflowInput> {
  const inputs: Record<string, WorkflowInput> = {}
  
  try {
    const doc = yaml.load(yamlContent) as any
    
    if (!doc || typeof doc !== 'object') {
      return inputs
    }
    
    // Navigate to workflow_dispatch.inputs
    const on = doc.on
    if (!on || typeof on !== 'object') {
      return inputs
    }
    
    const workflowDispatch = on.workflow_dispatch
    if (!workflowDispatch || typeof workflowDispatch !== 'object') {
      return inputs
    }
    
    const workflowInputs = workflowDispatch.inputs
    if (!workflowInputs || typeof workflowInputs !== 'object') {
      return inputs
    }
    
    // Process each input
    for (const [inputName, inputConfig] of Object.entries(workflowInputs)) {
      if (inputConfig && typeof inputConfig === 'object') {
        const config = inputConfig as any
        inputs[inputName] = {
          description: config.description || '',
          required: config.required === true,
          type: config.type || 'string',
          default: config.default,
          options: config.options
        }
      }
    }
  } catch (error) {
    console.error('Error parsing workflow YAML:', error)
  }
  
  return inputs
}