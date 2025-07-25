# API Integration Tests

This directory contains comprehensive integration tests for all GitHub API routes in the application.

## Overview

The integration tests validate that all API endpoints work correctly with real GitHub authentication and data. Tests are designed to run both locally and in CI/CD environments.

## Test Structure

### Files
- `integration.test.ts` - Main integration test suite
- `helpers.test.ts` - API helper function tests

### Test Categories

1. **API Route Structure Validation**
   - Verifies all required route files exist
   - Checks correct HTTP method exports
   - Validates dependency imports

2. **Authentication Flow Testing**
   - Valid/invalid token handling
   - Missing credential scenarios
   - Session management

3. **Repository API Testing**
   - User repositories endpoint
   - Organizations endpoint
   - Authentication requirement validation

4. **Specific Repository Routes**
   - Pull requests (GET/POST)
   - Actions/workflows
   - Repository contents
   - Repository status

5. **Error Handling**
   - GitHub API errors
   - Network failures
   - Malformed requests

6. **Real GitHub API Integration**
   - Live API validation (with TEST_TOKEN)
   - End-to-end route testing

## Running Tests

### Local Development

```bash
# Run all tests
npm test

# Run only integration tests
npm test -- app/api/__tests__/integration.test.ts

# Run with real GitHub token (for integration testing)
TEST_TOKEN=your_github_token npm test -- app/api/__tests__/integration.test.ts
```

### CI/CD Integration

The tests automatically detect the presence of `TEST_TOKEN` environment variable:

- **Without TEST_TOKEN**: Runs structure and unit tests (17 tests)
- **With TEST_TOKEN**: Runs all tests including real API calls (20 tests)

## Test Configuration

### Environment Variables

- `TEST_TOKEN` - GitHub personal access token for real API testing
- `SECRET_COOKIE_PASSWORD` - Session encryption password (automatically set)
- `NODE_ENV` - Test environment (automatically set to 'test')

### Required Permissions

The `TEST_TOKEN` should have these GitHub permissions:
- `repo` - Repository access
- `read:org` - Organization membership
- `read:user` - User profile information

## API Routes Tested

| Route | Method | Description |
|-------|---------|-------------|
| `/api/login` | POST | GitHub authentication |
| `/api/repos` | GET | User repositories |
| `/api/orgs` | GET | User organizations |
| `/api/repos/[owner]/[repo]/pulls` | GET | Repository pull requests |
| `/api/repos/[owner]/[repo]/pulls` | POST | Create pull request |
| `/api/repos/[owner]/[repo]/actions` | GET | Workflow runs |
| `/api/repos/[owner]/[repo]/contents` | GET | Repository contents |
| `/api/repos/[owner]/[repo]/status` | GET | Repository status |

## GitHub Actions Setup

Example workflow configuration:

```yaml
- name: Run integration tests with real GitHub API
  run: npm test -- app/api/__tests__/integration.test.ts
  env:
    TEST_TOKEN: ${{ secrets.TEST_TOKEN }}
```

### Setting up TEST_TOKEN Secret

1. Go to repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `TEST_TOKEN`
4. Value: Your GitHub personal access token
5. Click "Add secret"

## Test Output

### Without TEST_TOKEN
```
✓ API Route Structure Validation (3 tests)
✓ Authentication Flow Testing (3 tests)
✓ Repository API Testing (3 tests)
✓ Specific Repository Routes Testing (3 tests)
✓ Error Handling (2 tests)
○ Real GitHub API Integration (3 tests skipped)
✓ Integration Test Infrastructure (3 tests)

Total: 17 passed, 3 skipped
```

### With TEST_TOKEN
```
✓ API Route Structure Validation (3 tests)
✓ Authentication Flow Testing (3 tests)
✓ Repository API Testing (3 tests)
✓ Specific Repository Routes Testing (3 tests)
✓ Error Handling (2 tests)
✓ Real GitHub API Integration (3 tests)
✓ Integration Test Infrastructure (3 tests)

Total: 20 passed
```

## Troubleshooting

### Common Issues

1. **Tests fail with "401 Unauthorized"**
   - Check TEST_TOKEN is valid and has required permissions
   - Verify token hasn't expired

2. **Tests fail with "404 Not Found"**
   - Normal for test repository access - tests handle this gracefully
   - Check repository owner/name configuration

3. **Rate limiting errors**
   - Tests include rate limit handling
   - Consider using a dedicated testing token

### Debug Mode

Enable verbose logging:

```bash
DEBUG=1 npm test -- app/api/__tests__/integration.test.ts
```

## Contributing

When adding new API routes:

1. Add route file validation to structure tests
2. Add authentication tests if route requires auth
3. Add success/error scenario tests
4. Update this README with new route information