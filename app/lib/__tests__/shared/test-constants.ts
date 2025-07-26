/**
 * Shared test constants and configuration
 * Centralizes common test values used across multiple test files
 */

/**
 * Test target configuration
 */
export const TEST_TARGETS = {
  OWNER: "omercnet",
  REPO: "GitHub",
  USER: "omercnet",
  ORG: "omercnet",
} as const;

/**
 * API endpoint configurations
 */
export const API_ENDPOINTS = {
  GITHUB_API: "https://api.github.com",
  LOCAL_API: "http://localhost:3000/api",
} as const;

/**
 * Environment configurations
 */
export const TEST_ENV = {
  NODE_ENV: "test",
  SECRET_COOKIE_PASSWORD: "test_password_at_least_32_characters_long",
  FALLBACK_PASSWORD: "complex_password_at_least_32_characters_long",
} as const;

/**
 * Session configuration constants
 */
export const SESSION_CONFIG = {
  COOKIE_NAME: "github-ui-session",
  MIN_PASSWORD_LENGTH: 32,
  COOKIE_OPTIONS_TEST: {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
  },
  COOKIE_OPTIONS_PROD: {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
  },
} as const;

/**
 * GitHub API test endpoints
 */
export const GITHUB_ENDPOINTS = {
  REPO_INFO: (owner: string, repo: string) => `/repos/${owner}/${repo}`,
  PULLS: (owner: string, repo: string) => `/repos/${owner}/${repo}/pulls`,
  CONTENTS: (owner: string, repo: string) => `/repos/${owner}/${repo}/contents`,
  COMMITS: (owner: string, repo: string) => `/repos/${owner}/${repo}/commits`,
  BRANCHES: (owner: string, repo: string) => `/repos/${owner}/${repo}/branches`,
  WORKFLOW_RUNS: (owner: string, repo: string) =>
    `/repos/${owner}/${repo}/actions/runs`,
  WORKFLOWS: (owner: string, repo: string) =>
    `/repos/${owner}/${repo}/actions/workflows`,
  USER_ORGS: () => `/user/orgs`,
  USER_REPOS: () => `/user/repos`,
} as const;

/**
 * Test timeouts and performance limits
 */
export const PERFORMANCE_LIMITS = {
  FAST_OPERATION_MS: 100,
  MEDIUM_OPERATION_MS: 500,
  SLOW_OPERATION_MS: 2000,
  LARGE_DATA_SIZE: 1000,
} as const;

/**
 * Mock data templates
 */
export const MOCK_DATA = {
  REPOSITORY: {
    id: 1,
    name: "test-repo",
    owner: { login: "testuser" },
    full_name: "testuser/test-repo",
    description: "A test repository",
    private: false,
  },
  PULL_REQUEST: {
    id: 1,
    number: 1,
    title: "Test PR",
    state: "open",
    user: { login: "testuser" },
    head: { ref: "feature-branch" },
    base: { ref: "main" },
  },
  WORKFLOW_RUN: {
    id: 1,
    name: "CI",
    status: "completed",
    conclusion: "success",
    created_at: "2025-01-01T00:00:00Z",
  },
  USER: {
    login: "testuser",
    id: 1,
    type: "User",
  },
} as const;

/**
 * Test file extensions and patterns
 */
export const TEST_PATTERNS = {
  UNIT_TEST_FILES: "**/*.test.{ts,tsx}",
  INTEGRATION_TEST_FILES: "**/*.integration.test.{ts,tsx}",
  E2E_TEST_FILES: "**/*.spec.{ts,tsx}",
  ALL_TEST_FILES: "**/*.{test,spec}.{ts,tsx}",
} as const;

/**
 * Common HTTP status codes for testing
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  NOT_MODIFIED: 304,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Rate limiting constants
 */
export const RATE_LIMITS = {
  UNAUTHENTICATED: 60,
  AUTHENTICATED: 5000,
  GITHUB_APP: 5000,
} as const;

const testConstants = {
  TEST_TARGETS,
  API_ENDPOINTS,
  TEST_ENV,
  SESSION_CONFIG,
  GITHUB_ENDPOINTS,
  PERFORMANCE_LIMITS,
  MOCK_DATA,
  TEST_PATTERNS,
  HTTP_STATUS,
  RATE_LIMITS,
};

export default testConstants;
