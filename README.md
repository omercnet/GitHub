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
- **Testing**: Jest with React Testing Library for comprehensive unit tests
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

## Testing

The application includes comprehensive unit tests covering core functionality:

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test Coverage

- **28 comprehensive test cases** covering critical application logic
- **100% coverage** on core session management module
- **Tests include:**
  - Session configuration and security validation
  - GitHub token and repository parameter validation
  - API request/response helpers
  - Environment-specific behavior testing
  - Error handling scenarios
  - Type safety validation

### Test Structure

```
app/
├── lib/__tests__/
│   ├── session.test.ts     # Session management tests
│   ├── config.test.ts      # Configuration tests
│   └── utils.test.ts       # Utility function tests
└── api/__tests__/
    └── helpers.test.ts     # API helper tests
```

All tests are built with Jest and follow testing best practices for Next.js applications.

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

## GitHub Actions Workflows

This project uses GitHub Actions for continuous integration, code quality checks, security auditing, and automated deployment. The workflows follow best practices and use popular marketplace actions.

### Available Workflows

#### 1. CI Workflow (`.github/workflows/ci.yml`)
- **Triggers**: Push to main, Pull requests to main
- **Node.js Versions**: Tests on both Node.js 18.x and 20.x
- **Actions Used**:
  - `actions/checkout@v4` - Checkout repository code
  - `actions/setup-node@v4` - Setup Node.js with caching
- **Steps**:
  - Install dependencies with `npm ci`
  - Run ESLint linting
  - Build Next.js application
  - Verify build artifacts

#### 2. Code Quality Workflow (`.github/workflows/code-quality.yml`)
- **Triggers**: Pull requests to main
- **Features**:
  - **Reviewdog ESLint**: Automated code review with inline comments
  - **TypeScript Type Checking**: Ensures type safety across the codebase
- **Actions Used**:
  - `reviewdog/action-eslint@v1` - ESLint with automated review comments
  - Standard Node.js setup actions

#### 3. Security Audit Workflow (`.github/workflows/security.yml`)
- **Triggers**: 
  - Weekly schedule (Mondays at 9 AM UTC)
  - Push to main
  - Pull requests to main
- **Features**:
  - **npm audit**: Checks for known vulnerabilities in dependencies
  - **Dependency Review**: Reviews new dependencies in pull requests
- **Actions Used**:
  - `actions/dependency-review-action@v4` - GitHub's dependency review

#### 4. Deploy to Vercel Workflow (`.github/workflows/deploy.yml`)
- **Triggers**: Push to main, Manual dispatch
- **Features**:
  - Pre-deployment testing (lint, type-check, build)
  - Automated Vercel deployment for main branch
- **Actions Used**:
  - `amondnet/vercel-action@v25` - Vercel deployment action
- **Required Secrets**:
  - `VERCEL_TOKEN` - Vercel deployment token
  - `VERCEL_ORG_ID` - Your Vercel organization ID
  - `VERCEL_PROJECT_ID` - Your Vercel project ID
  - `SECRET_COOKIE_PASSWORD` - Application secret key

### Setting Up GitHub Actions

#### Required Secrets
To enable all workflows, add these secrets in your GitHub repository settings:

1. **For Deployment** (optional):
   ```
   VERCEL_TOKEN=your_vercel_token
   VERCEL_ORG_ID=your_vercel_org_id
   VERCEL_PROJECT_ID=your_vercel_project_id
   ```

2. **For Application**:
   ```
   SECRET_COOKIE_PASSWORD=your_32_character_or_longer_secret_key
   ```

#### Workflow Features

- **Parallel Testing**: CI workflow tests on multiple Node.js versions
- **Smart Caching**: npm dependencies are cached for faster builds
- **Fail Fast**: Workflows stop early on critical failures
- **Security First**: Regular vulnerability scans and dependency reviews
- **Code Quality**: Automated ESLint reviews with reviewdog
- **Type Safety**: TypeScript compilation checks on every PR

#### Customization

The workflows are designed to be easily customizable:

- **Node.js Versions**: Modify the matrix strategy in `ci.yml`
- **ESLint Rules**: Adjust `eslint_flags` in `code-quality.yml`
- **Security Schedule**: Change the cron schedule in `security.yml`
- **Deployment Target**: Replace Vercel action with your preferred platform

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run test:e2e` - Run end-to-end tests

### Git Hooks

This project uses [Husky](https://typicode.github.io/husky/) with [lint-staged](https://github.com/okonet/lint-staged) to ensure code quality:

- **Pre-commit hook**: Automatically runs ESLint on staged JavaScript/TypeScript files
- **Automatic setup**: Husky is automatically configured when you run `npm install`

The pre-commit hook will:
1. Run ESLint with `--fix` flag on staged `.js`, `.jsx`, `.ts`, `.tsx` files
2. Block the commit if there are any linting errors that cannot be auto-fixed
3. Allow the commit to proceed if all files pass linting

To bypass the pre-commit hook (not recommended):
```bash
git commit --no-verify
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is for educational and demonstration purposes. Please respect GitHub's terms of service when using their API.