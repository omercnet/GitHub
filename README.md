# GitHub UI Clone

A complete clone of GitHub's user interface built with Next.js 15, featuring dark-only theme and full repository management capabilities.

## Features

- **Authentication**: Secure login using GitHub Personal Access Tokens with encrypted session storage
- **Repository Management**: Browse and select from your accessible repositories
- **Code Viewer**: Navigate file trees, view directories, and read file contents
- **Pull Request Management**: List, create, merge pull requests, and view CI/CD status checks
- **GitHub Actions Integration**: View workflow runs, access logs with real-time updates, and re-run workflows

## Technology Stack

- **Framework**: Next.js 15 (App Router) with React Server and Client Components
- **UI**: Dark-only theme built with Tailwind CSS
- **Language**: TypeScript throughout
- **Authentication**: iron-session for encrypted HTTP-only cookies
- **GitHub API**: @octokit/core for API integration
- **Deployment**: Optimized for Vercel and serverless environments

## Getting Started

### Prerequisites

- Node.js 18+ 
- A GitHub Personal Access Token with appropriate repository permissions

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd GitHub
```

2. Install dependencies:
```bash
npm install
```

3. Create environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and set:
```
SECRET_COOKIE_PASSWORD=your_secret_password_at_least_32_characters_long
NODE_ENV=development
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Creating a GitHub Personal Access Token

1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Select the following scopes:
   - `repo` (Full control of private repositories)
   - `workflow` (Update GitHub Action workflows)
   - `read:org` (Read org and team membership)
4. Copy the generated token and use it to log into the application

## Usage

### Login
1. Enter your GitHub Personal Access Token on the login page
2. Select a repository from the dropdown list

### Code Viewer
- Browse repository file structure
- Click folders to navigate directories
- Click files to view their contents
- Use breadcrumb navigation to move between levels

### Pull Requests
- View all open pull requests
- Create new pull requests with title, head/base branches, and description
- Merge pull requests directly from the interface
- View CI/CD status checks and detailed check run results

### GitHub Actions
- View all workflow runs with status indicators
- Access real-time logs for running workflows
- Re-run failed workflows
- Logs automatically refresh every 5 seconds for active workflows

## API Routes

The application implements a complete proxy layer for GitHub's REST API:

- `POST /api/login` - Authenticate and store PAT
- `GET /api/repos` - List user repositories
- `GET /api/repos/[owner]/[repo]/contents` - Get file/directory contents
- `GET/POST /api/repos/[owner]/[repo]/pulls` - Manage pull requests
- `PUT /api/repos/[owner]/[repo]/pulls/[number]/merge` - Merge pull requests
- `GET /api/repos/[owner]/[repo]/status` - Get commit status and check runs
- `GET /api/repos/[owner]/[repo]/actions` - List workflow runs
- `GET/POST /api/repos/[owner]/[repo]/actions/[runId]` - View logs and re-run workflows

## Architecture

### Session Management
- Uses iron-session for secure, encrypted cookie-based sessions
- PAT tokens are stored server-side and never exposed to the client
- Automatic session validation on all API requests

### Incremental Log Updates
- Implements stateless log streaming using offset-based requests
- Client tracks current log length and requests only new content
- Compatible with serverless environments (no server-side caching required)
- Automatic refresh every 5 seconds for running workflows

### Error Handling
- Comprehensive error handling with user-friendly messages
- Rate limiting awareness for GitHub API calls
- Graceful handling of network failures and API errors

## Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard:
   - `SECRET_COOKIE_PASSWORD`
   - `NODE_ENV=production`
3. Deploy automatically on push to main branch

### Other Platforms
The application is compatible with any platform supporting Next.js 15:
- Netlify
- Railway
- DigitalOcean App Platform
- Self-hosted with Docker

## Security Considerations

- Never commit your Personal Access Token to the repository
- Use a strong, unique password for `SECRET_COOKIE_PASSWORD` (32+ characters)
- Tokens are stored in encrypted HTTP-only cookies
- All GitHub API calls are proxied server-side to prevent token exposure
- Consider using fine-grained personal access tokens for enhanced security

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is for educational and demonstration purposes. Please respect GitHub's terms of service when using their API.