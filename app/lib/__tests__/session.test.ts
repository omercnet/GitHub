import { SessionData, sessionOptions, defaultSession } from "../session";
import {
  testSessionConfiguration,
  testProductionConfiguration,
  mockEnvironment,
} from "./shared/session-test-helpers";
import { SESSION_CONFIG } from "./shared/test-constants";

describe("Session Configuration", () => {
  describe("SessionData interface", () => {
    it("should allow optional token property", () => {
      const sessionWithToken: SessionData = { token: "test-token" };
      const sessionWithoutToken: SessionData = {};

      expect(sessionWithToken.token).toBe("test-token");
      expect(sessionWithoutToken.token).toBeUndefined();
    });
  });

  describe("sessionOptions", () => {
    testSessionConfiguration(sessionOptions, {
      cookieName: SESSION_CONFIG.COOKIE_NAME,
      password: "test_password_at_least_32_characters_long",
      cookieOptions: SESSION_CONFIG.COOKIE_OPTIONS_TEST,
    });

    testProductionConfiguration(
      () => {
        jest.resetModules();
        const { sessionOptions: prodSessionOptions } = require("../session");
        return prodSessionOptions;
      },
      {
        secure: true,
      }
    );
  });

  describe("defaultSession", () => {
    it("should be an empty object", () => {
      expect(defaultSession).toEqual({});
    });

    it("should not have a token property", () => {
      expect(defaultSession.token).toBeUndefined();
    });
  });
});
