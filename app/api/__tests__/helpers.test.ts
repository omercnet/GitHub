/**
 * Unit tests for API route helpers and validation functions
 */

import { ValidationHelpers } from "../../lib/__tests__/shared/github-test-helpers";
import { HTTP_STATUS } from "../../lib/__tests__/shared/test-constants";

describe("API Route Helpers", () => {
  describe("Request Validation", () => {
    const validateTokenFromRequest = (token: any): string | null => {
      if (!token || typeof token !== "string" || token.trim() === "") {
        return null;
      }
      return token.trim();
    };

    const validateRepositoryParams = (
      owner: any,
      repo: any
    ): { owner: string; repo: string } | null => {
      if (
        !owner ||
        !repo ||
        typeof owner !== "string" ||
        typeof repo !== "string"
      ) {
        return null;
      }

      const ownerPattern = /^[a-zA-Z0-9-]+$/;
      const repoPattern = /^[a-zA-Z0-9._-]+$/;

      if (!ownerPattern.test(owner) || !repoPattern.test(repo)) {
        return null;
      }

      return { owner, repo };
    };

    it("should validate tokens correctly", () => {
      // Test valid tokens
      expect(validateTokenFromRequest("valid-token")).toBe("valid-token");
      expect(validateTokenFromRequest("  spaced-token  ")).toBe("spaced-token");

      // Test invalid tokens using shared validation patterns
      ValidationHelpers.invalidTokens.forEach((invalidToken) => {
        expect(validateTokenFromRequest(invalidToken)).toBeNull();
      });
    });

    it("should validate repository parameters correctly", () => {
      // Test valid repository parameters
      expect(validateRepositoryParams("owner", "repo")).toEqual({
        owner: "owner",
        repo: "repo",
      });
      expect(validateRepositoryParams("user-name", "repo-name")).toEqual({
        owner: "user-name",
        repo: "repo-name",
      });
      expect(validateRepositoryParams("user123", "repo.name")).toEqual({
        owner: "user123",
        repo: "repo.name",
      });

      // Test invalid repository parameters using shared validation patterns
      ValidationHelpers.invalidRepoParams.forEach(([owner, repo]) => {
        expect(validateRepositoryParams(owner, repo)).toBeNull();
      });
    });
  });

  describe("Response Helpers", () => {
    // Mock NextResponse for testing
    class MockNextResponse {
      data: any;
      status: number;

      constructor(data: any, init?: { status?: number }) {
        this.data = data;
        this.status = init?.status || 200;
      }

      json() {
        return Promise.resolve(this.data);
      }

      static json(data: any, init?: { status?: number }) {
        return new MockNextResponse(data, init);
      }
    }

    const createErrorResponse = (message: string, status: number) => {
      return MockNextResponse.json({ error: message }, { status });
    };

    const createSuccessResponse = (data: any) => {
      return MockNextResponse.json(data);
    };

    it("should create error responses correctly", async () => {
      const response = createErrorResponse("Not found", 404);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Not found");
    });

    it("should create success responses correctly", async () => {
      const testData = { success: true, data: "test" };
      const response = createSuccessResponse(testData);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(testData);
    });
  });

  describe("GitHub API Helpers", () => {
    const formatRepositoryUrl = (
      owner: string,
      repo: string,
      path?: string
    ): string => {
      const base = `/repos/${owner}/${repo}`;
      return path ? `${base}/${path}` : base;
    };

    const extractPullRequestNumber = (url: string): number | null => {
      const match = url.match(/\/pulls\/(\d+)/);
      return match ? parseInt(match[1], 10) : null;
    };

    it("should format repository URLs correctly", () => {
      expect(formatRepositoryUrl("owner", "repo")).toBe("/repos/owner/repo");
      expect(formatRepositoryUrl("owner", "repo", "pulls")).toBe(
        "/repos/owner/repo/pulls"
      );
      expect(formatRepositoryUrl("owner", "repo", "actions/runs")).toBe(
        "/repos/owner/repo/actions/runs"
      );
    });

    it("should extract pull request numbers correctly", () => {
      expect(extractPullRequestNumber("/repos/owner/repo/pulls/123")).toBe(123);
      expect(extractPullRequestNumber("/repos/owner/repo/pulls/42/files")).toBe(
        42
      );
      expect(
        extractPullRequestNumber("/repos/owner/repo/issues/123")
      ).toBeNull();
      expect(extractPullRequestNumber("/repos/owner/repo")).toBeNull();
    });
  });

  describe("Error Handling", () => {
    const handleApiError = (
      error: any
    ): { message: string; status: number } => {
      if (error.status) {
        switch (error.status) {
          case 401:
            return { message: "Authentication required", status: 401 };
          case 403:
            return { message: "Access forbidden", status: 403 };
          case 404:
            return { message: "Resource not found", status: 404 };
          default:
            return { message: "API error", status: error.status };
        }
      }

      return { message: "Internal server error", status: 500 };
    };

    it("should handle API errors correctly", () => {
      expect(handleApiError({ status: 401 })).toEqual({
        message: "Authentication required",
        status: 401,
      });
      expect(handleApiError({ status: 403 })).toEqual({
        message: "Access forbidden",
        status: 403,
      });
      expect(handleApiError({ status: 404 })).toEqual({
        message: "Resource not found",
        status: 404,
      });
      expect(handleApiError({ status: 500 })).toEqual({
        message: "API error",
        status: 500,
      });
      expect(handleApiError(new Error("Network error"))).toEqual({
        message: "Internal server error",
        status: 500,
      });
    });
  });
});
