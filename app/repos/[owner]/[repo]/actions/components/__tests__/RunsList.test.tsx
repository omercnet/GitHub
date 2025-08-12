import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RunsList } from '@/app/repos/[owner]/[repo]/actions/components/RunsList'

// Mock JobLogModal
jest.mock('@/app/repos/[owner]/[repo]/actions/components/JobLogModal', () => {
  return function MockJobLogModal({ onClose, job }: any) {
    return (
      <div data-testid="job-log-modal">
        <button onClick={onClose}>Close</button>
        <span>Job: {job.name}</span>
      </div>
    )
  }
})

const mockRuns = [
  {
    id: 1,
    name: 'CI Build',
    run_number: 42,
    status: 'completed',
    conclusion: 'success',
    event: 'push',
    head_branch: 'main',
    head_sha: 'abc123def456',
    duration_ms: 180000,
    created_at: '2025-01-15T10:00:00Z',
    html_url: 'https://github.com/test/repo/actions/runs/1',
    actor: {
      login: 'testuser',
      avatar_url: 'https://github.com/testuser.png'
    }
  }
]

const mockJobs = [
  {
    id: 101,
    name: 'build',
    status: 'completed',
    conclusion: 'success',
    started_at: '2025-01-15T10:00:00Z',
    completed_at: '2025-01-15T10:03:00Z'
  },
  {
    id: 102,
    name: 'test',
    status: 'completed', 
    conclusion: 'failure',
    started_at: '2025-01-15T10:03:00Z',
    completed_at: '2025-01-15T10:05:00Z'
  }
]

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('RunsList Enhanced Features', () => {
  const defaultProps = {
    runs: mockRuns,
    onExpand: jest.fn(),
    expanded: new Set(),
    onAction: jest.fn(),
    loading: false,
    owner: 'testuser',
    repo: 'testrepo'
  }

  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('renders workflow runs with clickable rows', () => {
    render(<RunsList {...defaultProps} />)
    
    expect(screen.getByText('CI Build')).toBeInTheDocument()
    expect(screen.getByText('#42')).toBeInTheDocument()
    expect(screen.getByText('push')).toBeInTheDocument()
    expect(screen.getByText('main')).toBeInTheDocument()
    expect(screen.getByText('testuser')).toBeInTheDocument()
  })

  it('expands workflow to show jobs when clicked', async () => {
    const onExpand = jest.fn()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jobs: mockJobs })
    })

    render(<RunsList {...defaultProps} onExpand={onExpand} expanded={new Set([1])} />)
    
    // Should show the jobs summary
    await waitFor(() => {
      expect(screen.getByText('2 jobs')).toBeInTheDocument()
      expect(screen.getByText('1 failed')).toBeInTheDocument()
    })

    expect(screen.getByText('build')).toBeInTheDocument()
    expect(screen.getByText('test')).toBeInTheDocument()
  })

  it('shows job status indicators correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jobs: mockJobs })
    })

    render(<RunsList {...defaultProps} expanded={new Set([1])} />)
    
    await waitFor(() => {
      // Check for success and failure indicators (emojis)
      expect(screen.getByText('✅')).toBeInTheDocument()
      expect(screen.getByText('❌')).toBeInTheDocument()
    })
  })

  it('opens job log modal when logs button clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jobs: mockJobs })
    })

    render(<RunsList {...defaultProps} expanded={new Set([1])} />)
    
    await waitFor(() => {
      expect(screen.getByText('build')).toBeInTheDocument()
    })

    // Click logs button for first job
    const logsButtons = screen.getAllByText('Logs')
    fireEvent.click(logsButtons[0])

    // Should open modal
    await waitFor(() => {
      expect(screen.getByTestId('job-log-modal')).toBeInTheDocument()
      expect(screen.getByText('Job: build')).toBeInTheDocument()
    })
  })

  it('handles API errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'Not Found'
    })

    render(<RunsList {...defaultProps} expanded={new Set([1])} />)
    
    await waitFor(() => {
      expect(screen.getByText('API error: 404 Not Found')).toBeInTheDocument()
    })
  })

  it('shows loading state for jobs', async () => {
    // Mock fetch that never resolves
    mockFetch.mockImplementationOnce(() => new Promise(() => {}))

    render(<RunsList {...defaultProps} expanded={new Set([1])} />)
    
    expect(screen.getByText('Loading jobs…')).toBeInTheDocument()
  })

  it('displays job durations correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jobs: mockJobs })
    })

    render(<RunsList {...defaultProps} expanded={new Set([1])} />)
    
    await waitFor(() => {
      // Check for formatted duration (3 minutes = 180000ms)
      expect(screen.getByText('3m')).toBeInTheDocument()
      // Check for 2 minutes duration
      expect(screen.getByText('2m')).toBeInTheDocument()
    })
  })
})
