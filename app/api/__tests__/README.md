# GitHub API Integration Tests

This directory contains comprehensive integration tests for all GitHub API routes implemented in this application.

## Overview

The integration tests validate API endpoints using a testing bypass mechanism that allows access to public GitHub repositories without authentication. This enables thorough testing of the application's API routes without requiring real GitHub tokens.

## Test Architecture

The tests run in **testing mode** with authentication bypass enabled:

1. **Testing Mode** - `NODE_ENV=test` and `BYPASS_AUTH_FOR_TESTING=true`
   - Validates API route structure and functionality
   - Tests against public GitHub repository (`omercnet/GitHub`)
   - No real GitHub token required
   - Uses authentication bypass for testing purposes only

## Test Structure

```
app/api/__tests__/
├── utils/
│   └── test-helpers.ts          # Simple test utilities
├── integration.test.ts          # Comprehensive integration tests
└── README.md                    # This documentation
```

## Test Configuration

### Environment Variables

- `NODE_ENV=test` - Enables testing mode
- `BYPASS_AUTH_FOR_TESTING=true` - Enables authentication bypass for testing
- No GitHub token required

### Test Execution

```bash
# Run integration tests (testing mode with bypass enabled)
NODE_ENV=test BYPASS_AUTH_FOR_TESTING=true npm test

# Or simply (CI/CD will set these automatically)
npm test
```

## What Gets Tested

### API Route Structure
- ✅ All API route files exist and have proper exports
- ✅ Session configuration is properly set up
- ✅ Authentication bypass mechanism is in place

### Authentication Bypass
- ✅ Testing mode enables bypass of iron-session authentication
- ✅ Production mode still requires valid GitHub tokens
- ✅ Bypass only works when both environment variables are set

### API Route Functionality
- ✅ `/api/repos` - Repository listing
- ✅ `/api/orgs` - Organization access
- ✅ `/api/repos/[owner]/[repo]/pulls` - Pull requests
- ✅ `/api/repos/[owner]/[repo]/actions` - Workflow runs
- ✅ `/api/repos/[owner]/[repo]/contents` - Repository contents
- ✅ `/api/repos/[owner]/[repo]/status` - Repository status

### Public GitHub API Access
- ✅ Direct GitHub API connectivity for public repositories
- ✅ Repository data structure validation
- ✅ Workflow runs and status information
- ✅ Pull requests and repository contents

## Security

The authentication bypass is designed for testing purposes only:

- ✅ Only works when `NODE_ENV=test`
- ✅ Only works when `BYPASS_AUTH_FOR_TESTING=true`
- ✅ In production, all routes require valid GitHub token authentication
- ✅ iron-session encryption still works for production authentication

## CI/CD Integration

The GitHub Actions workflow automatically sets the required environment variables:

```yaml
- name: Run integration tests
  run: npm test -- app/api/__tests__/integration.test.ts
  env:
    NODE_ENV: test
    BYPASS_AUTH_FOR_TESTING: true
```

## Production vs Testing

| Mode | Authentication | Token Required | Repository Access |
|------|---------------|----------------|-------------------|
| Production | iron-session required | ✅ Yes | Private & Public |
| Testing | Bypass enabled | ❌ No | Public only |

This ensures comprehensive testing without compromising security in production.

# Run specific test file
npm test -- app/api/__tests__/repos.integration.test.ts

# Run all integration tests
npm test -- app/api/__tests__/*.integration.test.ts
```

## API Routes Tested

### Authentication (`auth.integration.test.ts`)
- `POST /api/login` - GitHub authentication flow
- Real GitHub API user validation
- Token format and validity checks

### Repository Management (`repos.integration.test.ts`)
- `GET /api/repos` - User repositories (personal and organization)
- Repository permissions and access validation
- Real repository data from `omercnet/GitHub`

### Organization Management (`orgs.integration.test.ts`)
- `GET /api/orgs` - User organizations
- Organization membership validation
- Public/private organization access

### Pull Requests (`pulls.integration.test.ts`)
- `GET /api/repos/[owner]/[repo]/pulls` - Pull requests listing
- `POST /api/repos/[owner]/[repo]/pulls` - Pull request creation
- Pull request permissions and structure validation

### GitHub Actions (`actions.integration.test.ts`)
- `GET /api/repos/[owner]/[repo]/actions` - Workflow runs
- Workflow structure and permissions
- Real workflow run validation from existing actions

### Repository Contents (`contents.integration.test.ts`)
- `GET /api/repos/[owner]/[repo]/contents` - Repository contents
- File and directory structure validation
- Repository tree and commit access

### Repository Status (`status.integration.test.ts`)
- `GET /api/repos/[owner]/[repo]/status` - Repository status
- Repository health and statistics
- Branch protection and activity validation

### Infrastructure (`infrastructure.integration.test.ts`)
- Test environment configuration
- Token validation logic
- CI/CD readiness checks
- Test file structure validation

## Test Categories

### 1. Structure Validation (`structure.integration.test.ts`)
- API route file existence
- HTTP method exports
- Required dependencies

### 2. Authentication Flow (`auth.integration.test.ts`)
- Token validation and format checking
- Session management  
- Real GitHub API authentication

### 3. Repository Operations (`repos.integration.test.ts`)
- Repository listing and access
- Permission validation
- Real repository data validation

### 4. Organization Operations (`orgs.integration.test.ts`)
- Organization membership
- Public/private access
- User organization listing

### 5. Pull Request Management (`pulls.integration.test.ts`)
- Pull request CRUD operations
- PR permissions and validation
- Real PR data from target repository

### 6. Actions/Workflows (`actions.integration.test.ts`)
- Workflow run access
- Actions permissions
- Real workflow validation

### 7. Content Management (`contents.integration.test.ts`)
- File and directory access
- Repository tree navigation
- Content permissions

### 8. Repository Status (`status.integration.test.ts`)
- Repository health metrics
- Activity and statistics
- Branch and protection status

### 9. Test Infrastructure (`infrastructure.integration.test.ts`)
- Environment validation
- Token format checking
- CI/CD configuration
- Test coverage validation

## Shared Utilities

### `utils/test-helpers.ts`

Provides common functionality:
- `getTestConfig()` - Get test configuration and token validation
- `isRealGitHubToken()` - Validate GitHub token format
- `createConditionalDescribe()` - Skip tests without real tokens
- `createGitHubClient()` - Create HTTP client for GitHub API
- `createMockSession()` - Create mock session for testing
- `createMockRequest()` - Create mock Next.js request

## CI/CD Integration

### GitHub Actions

The tests are configured to run in GitHub Actions with the `TEST_TOKEN` secret:

```yaml
- name: Run integration tests
  run: npm test -- app/api/__tests__/*.integration.test.ts
  env:
    TEST_TOKEN: ${{ secrets.TEST_TOKEN }}
```

### Expected Results

| Test Mode | Without TOKEN | With TOKEN |
|-----------|---------------|------------|
| Structure Tests | ✅ Pass | ✅ Pass |
| Unit Tests | ✅ Pass | ✅ Pass |
| Real API Tests | ⏭️ Skip | ✅ Pass |
| **Total** | **~30 pass, ~20 skip** | **~50 pass** |

## Setup Instructions

### 1. Local Development

```bash
# Install dependencies
npm install

# Run all tests (structure tests only without token)
npm test

# Run specific test category
npm test -- app/api/__tests__/repos.integration.test.ts

# Run with real GitHub API (requires token)
TEST_TOKEN=ghp_your_token_here npm test
```

### 2. GitHub Actions Setup

1. Add `TEST_TOKEN` to repository secrets
2. Ensure token has access to `omercnet/GitHub` repository
3. Token should be associated with `omercbot` user

### 3. Token Requirements

The `TEST_TOKEN` should have:
- `repo` scope for repository access
- `read:org` scope for organization data
- `workflow` scope for Actions access

## Test Data

All real API tests target:
- **Repository**: `omercnet/GitHub`
- **Authenticated User**: `omercbot`
- **Organization**: `omercnet`

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check token validity and permissions
2. **404 Not Found**: Verify repository access and existence
3. **Rate Limiting**: GitHub API has rate limits for authenticated requests
4. **Network Errors**: Check internet connectivity and GitHub API status
5. **Token Format**: Ensure token starts with valid GitHub prefix (ghp_, github_pat_, etc.)

### Debug Mode

Enable verbose logging by setting:
```bash
DEBUG=true TEST_TOKEN=your_token npm test
```

## Contributing

When adding new API routes:

1. Create or update the appropriate test file in the modular structure
2. Add route tests with both structure validation and real API tests
3. Use shared utilities from `utils/test-helpers.ts`
4. Update this README with new route documentation
5. Ensure tests work both with and without `TEST_TOKEN`

## Security Notes

- Never commit real tokens to source code
- Use GitHub secrets for CI/CD token storage
- Test tokens should have minimal required permissions
- Regularly rotate test tokens for security
- Token validation logic prevents dummy tokens from reaching real API