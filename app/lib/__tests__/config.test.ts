/**
 * Integration tests for configuration and setup
 */

import { createEnvironmentTests } from "./shared/environment-helpers";
import { TEST_ENV, SESSION_CONFIG } from "./shared/test-constants";

describe("Application Configuration", () => {
  describe("Test Environment Setup", () => {
    createEnvironmentTests({
      NODE_ENV: TEST_ENV.NODE_ENV,
      SECRET_COOKIE_PASSWORD: TEST_ENV.SECRET_COOKIE_PASSWORD,
    });
  });

  describe("Module Loading", () => {
    it("should be able to import session module", async () => {
      const sessionModule = await import("../session");
      expect(sessionModule).toBeDefined();
      expect(sessionModule.sessionOptions).toBeDefined();
      expect(sessionModule.defaultSession).toBeDefined();
    });

    it("should have consistent exports from session module", async () => {
      const sessionModule = await import("../session");
      expect(typeof sessionModule.sessionOptions).toBe("object");
      expect(typeof sessionModule.defaultSession).toBe("object");
    });
  });

  describe("Configuration Validation", () => {
    it("should have valid session configuration", async () => {
      const { sessionOptions } = await import("../session");

      expect(sessionOptions.cookieName).toBe(SESSION_CONFIG.COOKIE_NAME);
      expect(sessionOptions.password).toBe(TEST_ENV.SECRET_COOKIE_PASSWORD);
      expect(sessionOptions.cookieOptions).toEqual(
        SESSION_CONFIG.COOKIE_OPTIONS_TEST
      );
    });

    it("should handle production environment configuration", () => {
      // Temporarily set NODE_ENV to production
      const originalEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "production",
        configurable: true,
      });

      // Clear module cache to get fresh import
      jest.resetModules();

      return import("../session").then(({ sessionOptions }) => {
        expect(sessionOptions.cookieOptions?.secure).toBe(true);

        // Restore original environment
        Object.defineProperty(process.env, "NODE_ENV", {
          value: originalEnv,
          configurable: true,
        });
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle missing environment variables gracefully", () => {
      const originalPassword = process.env.SECRET_COOKIE_PASSWORD;
      delete process.env.SECRET_COOKIE_PASSWORD;

      jest.resetModules();

      return import("../session").then(({ sessionOptions }) => {
        expect(sessionOptions.password).toBe(TEST_ENV.FALLBACK_PASSWORD);

        // Restore original environment
        process.env.SECRET_COOKIE_PASSWORD = originalPassword;
      });
    });
  });
});
