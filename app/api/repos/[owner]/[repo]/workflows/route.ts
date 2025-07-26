import { getOctokit } from '@/app/lib/octokit'
import { NextRequest, NextResponse } from 'next/server'

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

function parseWorkflowInputs(yamlContent: string): Record<string, any> {
  const inputs: Record<string, any> = {}
  
  try {
    // Simple regex-based parsing for workflow_dispatch inputs
    const workflowDispatchMatch = yamlContent.match(/workflow_dispatch:\s*([\s\S]*?)(?=\n\w|\n$|$)/m)
    if (!workflowDispatchMatch) return inputs
    
    const dispatchSection = workflowDispatchMatch[1]
    const inputsMatch = dispatchSection.match(/inputs:\s*([\s\S]*?)(?=\n\s{0,2}\w|\n$|$)/m)
    if (!inputsMatch) return inputs
    
    const inputsSection = inputsMatch[1]
    const inputBlocks = inputsSection.split(/\n(?=\s{4}\w)/m)
    
    for (const block of inputBlocks) {
      const lines = block.trim().split('\n')
      if (lines.length === 0) continue
      
      const inputName = lines[0].trim().replace(':', '')
      const inputData: any = {}
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (line.includes(':')) {
          const [key, ...valueParts] = line.split(':')
          const value = valueParts.join(':').trim().replace(/^['"]|['"]$/g, '')
          if (value) {
            inputData[key.trim()] = value
          }
        }
      }
      
      if (Object.keys(inputData).length > 0) {
        inputs[inputName] = inputData
      }
    }
  } catch (error) {
    console.error('Error parsing workflow inputs:', error)
  }
  
  return inputs
}