# GitHub Copilot Instructions

This repository is a GitHub UI clone built with Next.js 15, TypeScript, and the GitHub API. These instructions help GitHub Copilot understand the project context and coding conventions.

## 🏗️ Project Architecture

- **Framework**: Next.js 15 with App Router (React Server and Client Components)
- **Language**: TypeScript throughout - maintain strict type safety
- **Styling**: Tailwind CSS with dark-only theme
- **Authentication**: iron-session for encrypted HTTP-only cookies
- **GitHub API**: @octokit/core for API integration
- **Testing**: Jest with React Testing Library, Playwright for E2E
- **Environment**: Optimized for Vercel and serverless deployments

## ✅ When Writing Code

- **Write modular, readable, and documented code** - Follow existing patterns in `app/lib/` and `app/api/`
- **Follow language and project conventions strictly**:
  - Use TypeScript interfaces for all data structures (see `app/lib/session.ts`)
  - Implement proper error handling with user-friendly messages
  - Use React Server Components by default, Client Components only when needed (`'use client'`)
  - Follow Next.js 15 App Router conventions for file structure
- **Include unit tests and ensure CI passes**:
  - Add tests in `__tests__` directories following existing patterns
  - Maintain current test coverage standards (38+ tests)
  - Use Jest with React Testing Library for component testing
- **Never hardcode secrets or sensitive data**:
  - Use environment variables from `.env.local`
  - Store sensitive data in iron-session encrypted cookies
  - Proxy all GitHub API calls server-side to protect tokens

## 🔐 Security

- **Use environment variables or secrets managers**:
  - `SECRET_COOKIE_PASSWORD` for session encryption (32+ characters)
  - GitHub Personal Access Tokens stored in encrypted sessions only
  - Reference `.env.example` for required variables
- **Scan code for secrets and vulnerabilities before committing**:
  - Security workflow runs weekly and on PRs
  - Use `npm audit` for dependency vulnerabilities
  - Never expose GitHub tokens to client-side code

## 📝 Commits

- **Follow Conventional Commits format**:
  ```
  feat(login): add passwordless flow
  fix(auth): handle expired session token
  chore: update dependencies
  docs(readme): update deployment instructions
  test(api): add github api integration tests
  ```
- **Write concise but descriptive commit messages**
- **Group related changes in a single commit or PR**

## 🧪 CI/CD

- **Ensure CI passes locally and in PR before merging**:
  - Run `npm run lint` (ESLint with reviewdog integration)
  - Run `npm test` (Jest unit tests)
  - Run `npm run build` (Next.js build verification)
  - Run `npm run test:e2e` (Playwright tests)
- **Automate deployments via CI on merge** - Vercel deployment configured
- **Include linting, testing, and security scanning in pipelines**:
  - CI workflow: ESLint + build + test on Node.js 22.x
  - Code Quality workflow: reviewdog ESLint + TypeScript checking
  - Security workflow: npm audit + dependency review

## 🔖 Tags & Releases

- **Use semantic versioning** (`v1.2.3`) for releases
- **Use tools like `release-please` or `semantic-release` to automate** releases
- Follow existing version patterns in `package.json`

## 📄 Docs

- **Update `README.md` and `docs/` if anything significant changes**
- **Add usage, config, and troubleshooting for each feature**:
  - Update API routes section for new endpoints
  - Document new environment variables
  - Include testing instructions for new features
  - Update architecture diagrams if data flow changes

## 🎯 Project-Specific Guidelines

### API Routes (`app/api/`)
- Implement session validation on all routes
- Use consistent error response format
- Proxy GitHub API calls to protect tokens
- Handle rate limiting gracefully

### Components & Pages (`app/`)
- Use TypeScript interfaces for props and state
- Implement loading states and error boundaries
- Follow dark theme conventions consistently
- Use Tailwind utility classes following existing patterns

### Session Management (`app/lib/session.ts`)
- Always encrypt sensitive data in cookies
- Validate sessions on API routes
- Handle session expiration gracefully

### Testing (`__tests__/`)
- Test critical authentication and API logic
- Mock external API calls appropriately
- Maintain existing test structure and patterns
- Include both positive and negative test cases

### Environment Configuration
- Development: Uses HTTP cookies, local environment
- Production: Uses HTTPS, encrypted sessions, Vercel environment

## 🚨 Red Flags (NEVER DO THIS)

- 🚫 **Push to main without review** - All changes must go through PR process
- 🚫 **Commit commented-out code or debug prints** - Clean up before committing
- 🚫 **Skip tests or linting** - CI must pass before merge
- 🚫 **Ignore failed CI steps** - Fix issues, don't bypass checks
- 🚫 **Expose GitHub tokens client-side** - Always proxy through API routes
- 🚫 **Break existing session management** - Maintain iron-session patterns
- 🚫 **Add dependencies without justification** - Keep bundle size minimal
- 🚫 **Hardcode API endpoints or configuration** - Use environment variables

## 🛠️ Development Workflow

1. Create feature branch from main
2. Implement changes following conventions above
3. Write/update tests for new functionality
4. Run full test suite locally (`npm test`, `npm run lint`, `npm run build`)
5. Submit PR with descriptive title and description
6. Address any CI failures or review feedback
7. Merge after approval and passing CI

This ensures high code quality, security, and maintainability while leveraging the existing robust CI/CD infrastructure.