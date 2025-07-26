/**
 * Shared GitHub API testing utilities
 * Consolidates duplicated validation logic
 */

/**
 * Common validation patterns
 */
export const ValidationPatterns = {
  GITHUB_TOKEN: /^(ghp_|github_pat_|ghs_|gho_|ghu_|ghr_)/,
  OWNER_NAME: /^[a-zA-Z0-9-]+$/,
  REPO_NAME: /^[a-zA-Z0-9._-]+$/,
  API_PATH: /^\/[^\/].*/,
} as const;

/**
 * Validation helper functions
 */
/**
 * GitHub API testing and validation utilities
 * Provides validation helpers and security test patterns
 */

/**
 * Validation utility functions for GitHub API testing
 */
export class ValidationHelpers {
  static invalidTokens = ["", "   ", null, undefined, 123];

  static invalidRepoParams = [
    ["", "repo"],
    ["owner", ""],
    ["owner!", "repo"],
    ["owner", "repo@name"],
    [null, "repo"],
    ["owner", null],
  ];

  static isValidGitHubToken(token: string): boolean {
    return typeof token === "string" && token.trim().length > 0;
  }

  static isValidRepositoryName(name: string): boolean {
    const pattern = /^[a-zA-Z0-9._-]+$/;
    return typeof name === "string" && pattern.test(name);
  }

  static isValidOwnerName(owner: string): boolean {
    const pattern = /^[a-zA-Z0-9-]+$/;
    return typeof owner === "string" && pattern.test(owner);
  }

  static isValidGitHubApiPath(path: string): boolean {
    return typeof path === "string" && path.startsWith("/");
  }

  static validateRepositoryParams(
    owner: any,
    repo: any
  ): { owner: string; repo: string } | null {
    if (
      !owner ||
      !repo ||
      typeof owner !== "string" ||
      typeof repo !== "string"
    ) {
      return null;
    }

    if (!this.isValidOwnerName(owner) || !this.isValidRepositoryName(repo)) {
      return null;
    }

    return { owner, repo };
  }

  static validateTokenFromRequest(token: any): string | null {
    if (!token || typeof token !== "string" || token.trim() === "") {
      return null;
    }
    return token.trim();
  }
}

/**
 * Security test cases for malicious input
 */
export const SecurityTestCases = {
  XSS_ATTEMPTS: [
    '<script>alert("xss")</script>',
    "javascript:alert(1)",
    "<img src=x onerror=alert(1)>",
    "&lt;script&gt;alert(1)&lt;/script&gt;",
  ],

  SQL_INJECTION_ATTEMPTS: [
    "'; DROP TABLE users; --",
    "admin'/*",
    "1' OR '1'='1",
    "admin'; --",
  ],

  PATH_TRAVERSAL_ATTEMPTS: [
    "../../../etc/passwd",
    "..\\windows\\system32",
    "../../../../root",
    "..%2F..%2F..%2Fetc%2Fpasswd",
  ],

  UNICODE_ATTEMPTS: [
    "üser",
    "user🚀",
    "用户",
    "user\u0000name",
    "user\x00name",
  ],
};

/**
 * Test validation functions with common patterns
 */
export function runValidationTests(type: "token" | "owner" | "repo" | "path") {
  const validator = {
    token: ValidationHelpers.isValidGitHubToken,
    owner: ValidationHelpers.isValidOwnerName,
    repo: ValidationHelpers.isValidRepositoryName,
    path: ValidationHelpers.isValidGitHubApiPath,
  }[type];

  describe(`${type} validation`, () => {
    it(`should handle malicious ${type} input attempts`, () => {
      // Test all security cases
      [
        ...SecurityTestCases.XSS_ATTEMPTS,
        ...SecurityTestCases.SQL_INJECTION_ATTEMPTS,
        ...SecurityTestCases.PATH_TRAVERSAL_ATTEMPTS,
        ...SecurityTestCases.UNICODE_ATTEMPTS,
      ].forEach((maliciousInput) => {
        expect(validator(maliciousInput)).toBe(false);
      });
    });

    it(`should validate edge cases for ${type}`, () => {
      // Common edge cases
      expect(validator("")).toBe(false);
      expect(validator(" ")).toBe(false);
      expect(validator("  ")).toBe(false);
    });
  });
}

/**
 * GitHub API request helpers for tests
 */
export class GitHubTestHelpers {
  static async makeGitHubAPIRequest(
    path: string,
    token?: string
  ): Promise<any> {
    const https = require("https");

    return new Promise((resolve, reject) => {
      const headers: any = {
        "User-Agent": "GitHub-Integration-Test",
        Accept: "application/vnd.github.v3+json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const req = https.request(
        {
          hostname: "api.github.com",
          path,
          method: "GET",
          headers,
        },
        (res: any) => {
          let data = "";
          res.on("data", (chunk: any) => (data += chunk));
          res.on("end", () => {
            try {
              resolve({
                status: res.statusCode,
                data: data ? JSON.parse(data) : null,
                headers: res.headers,
              });
            } catch (error) {
              resolve({
                status: res.statusCode,
                data: null,
                headers: res.headers,
              });
            }
          });
        }
      );

      req.on("error", reject);
      req.end();
    });
  }

  static createMockNextResponse() {
    return class MockNextResponse {
      data: any;
      status: number;

      constructor(data: any, init?: { status?: number }) {
        this.data = data;
        this.status = init?.status || 200;
      }

      async json() {
        return this.data;
      }

      static json(data: any, init?: { status?: number }) {
        return new MockNextResponse(data, init);
      }
    };
  }
}

/**
 * Common test constants
 */
export const TEST_CONSTANTS = {
  OWNER: "omercnet",
  REPO: "GitHub",
  USER: "omercnet",
  API_BASE: "https://api.github.com",
  LOCAL_API_BASE: "http://localhost:3000/api",
} as const;
