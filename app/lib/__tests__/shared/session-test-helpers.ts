/**
 * Shared session testing utilities
 * Consolidates duplicated session configuration tests
 */

export interface SessionTestHelpers {
  testSessionConfiguration: () => void;
  testProductionConfiguration: () => void;
  testEnvironmentVariableHandling: () => void;
  mockEnvironment: (env: string) => () => void;
}

/**
 * Shared session testing utilities
 * Consolidates common session configuration testing patterns
 */

/**
 * Test session configuration with expected values
 */
export function testSessionConfiguration(
  sessionOptions: any,
  expected: {
    cookieName: string;
    password: string;
    cookieOptions: object;
  }
) {
  it("should have correct cookie name", () => {
    expect(sessionOptions.cookieName).toBe(expected.cookieName);
  });

  it("should use environment password or fallback", () => {
    expect(sessionOptions.password).toBe(expected.password);
  });

  it("should have secure cookie options", () => {
    expect(sessionOptions.cookieOptions).toEqual(expected.cookieOptions);
  });
}

/**
 * Test production configuration behavior
 */
export function testProductionConfiguration(
  getSessionOptions: () => any,
  expected: {
    secure: boolean;
  }
) {
  it("should set secure to true in production", () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "production",
      configurable: true,
    });

    const prodSessionOptions = getSessionOptions();

    expect(prodSessionOptions.cookieOptions?.secure).toBe(expected.secure);

    // Restore original env
    Object.defineProperty(process.env, "NODE_ENV", {
      value: originalEnv,
      configurable: true,
    });
  });
}

/**
 * Test missing environment variable handling
 */
export function testEnvironmentVariableHandling() {
  it("should handle missing environment variables gracefully", () => {
    const originalPassword = process.env.SECRET_COOKIE_PASSWORD;
    delete process.env.SECRET_COOKIE_PASSWORD;

    jest.resetModules();

    return import("../../session").then(({ sessionOptions }) => {
      expect(sessionOptions.password).toBe(
        "complex_password_at_least_32_characters_long"
      );

      // Restore environment
      process.env.SECRET_COOKIE_PASSWORD = originalPassword;
      jest.resetModules();
    });
  });
}

/**
 * Mock environment helper
 */
export function mockEnvironment(env: string) {
  return () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: env,
        configurable: true,
      });
      jest.resetModules();
    });

    afterEach(() => {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: originalEnv,
        configurable: true,
      });
      jest.resetModules();
    });
  };
}
