import { render, screen, fireEvent } from '@testing-library/react'
import LogFormatter from '@/app/components/LogFormatter'

const sampleLogs = `2025-07-26T06:22:40.5975705Z Current runner version: '2.326.0'
2025-07-26T06:22:40.6008977Z ##[group]Runner Image Provisioner
2025-07-26T06:22:40.6010231Z Hosted Compute Agent
2025-07-26T06:22:40.6011142Z Version: 20250711.363
2025-07-26T06:22:40.6012602Z Commit: 6785254374ce925a23743850c1cb91912ce5c14c
2025-07-26T06:22:40.6013805Z Build Date: 2025-07-11T20:04:25Z
2025-07-26T06:22:40.6014788Z ##[endgroup]
2025-07-26T06:22:40.6016031Z ##[group]Operating System
2025-07-26T06:22:40.6016975Z Ubuntu
2025-07-26T06:22:40.6017788Z 24.04.2
2025-07-26T06:22:40.6018605Z LTS
2025-07-26T06:22:40.6019440Z ##[endgroup]
2025-07-26T06:22:40.6020355Z ##[group]GITHUB_TOKEN Permissions
2025-07-26T06:22:40.6033507Z Actions: read
2025-07-26T06:22:40.6034420Z Contents: read
2025-07-26T06:22:40.6035510Z Metadata: read
2025-07-26T06:22:40.6036330Z Packages: read
2025-07-26T06:22:40.6037421Z SecurityEvents: write
2025-07-26T06:22:40.6038402Z ##[endgroup]
2025-07-26T06:22:40.6041265Z Secret source: Actions`

describe('LogFormatter', () => {
  it('renders formatted logs correctly', () => {
    render(<LogFormatter logs={sampleLogs} />)
    
    // Check that groups are present
    expect(screen.getByText('📁 Runner Image Provisioner')).toBeInTheDocument()
    expect(screen.getByText('📁 Operating System')).toBeInTheDocument()
    expect(screen.getByText('📁 GITHUB_TOKEN Permissions')).toBeInTheDocument()
    
    // Check that standalone log line is visible
    expect(screen.getByText("Current runner version: '2.326.0'")).toBeInTheDocument()
  })

  it('allows expanding and collapsing groups', () => {
    render(<LogFormatter logs={sampleLogs} />)
    
    const groupButton = screen.getByText('📁 Runner Image Provisioner')
    
    // Initially collapsed
    expect(screen.queryByText('Hosted Compute Agent')).not.toBeInTheDocument()
    
    // Click to expand
    fireEvent.click(groupButton)
    
    // Should now be visible
    expect(screen.getByText('Hosted Compute Agent')).toBeInTheDocument()
    expect(screen.getByText('Version: 20250711.363')).toBeInTheDocument()
    
    // Click to collapse
    fireEvent.click(groupButton)
    
    // Should be hidden again
    expect(screen.queryByText('Hosted Compute Agent')).not.toBeInTheDocument()
  })

  it('handles empty logs gracefully', () => {
    render(<LogFormatter logs="" />)
    expect(screen.getByText('No logs available')).toBeInTheDocument()
  })

  it('formats timestamps correctly', () => {
    render(<LogFormatter logs={sampleLogs} />)
    
    // Should display formatted timestamps (without full date) - checking for multiple
    const timestamps = screen.getAllByText('06:22:40')
    expect(timestamps.length).toBeGreaterThan(0)
  })

  it('identifies different log types correctly', () => {
    const logsWithTypes = `2025-07-26T06:22:40.5975705Z This is an error message
2025-07-26T06:22:40.5975705Z This is a warning message
2025-07-26T06:22:40.5975705Z ##[command]npm install
2025-07-26T06:22:40.5975705Z Regular log line`

    render(<LogFormatter logs={logsWithTypes} />)
    
    // Error logs should have red styling
    const errorElement = screen.getByText('This is an error message')
    expect(errorElement).toHaveClass('text-red-400')
    
    // Warning logs should have yellow styling  
    const warningElement = screen.getByText('This is a warning message')
    expect(warningElement).toHaveClass('text-yellow-400')
    
    // Command logs should have blue styling
    const commandElement = screen.getByText('##[command]npm install')
    expect(commandElement).toHaveClass('text-blue-400')
    
    // Regular logs should have gray styling
    const regularElement = screen.getByText('Regular log line')
    expect(regularElement).toHaveClass('text-gray-300')
  })
})