/**
 * Shared environment testing utilities
 * Consolidates environment validation and setup
 */

/**
 * Environment validation helpers
 */
export const EnvironmentHelpers = {
  validateTestEnvironment: () => {
    expect(process.env.NODE_ENV).toBe("test");
    expect(process.env.SECRET_COOKIE_PASSWORD).toBeDefined();
    expect(process.env.SECRET_COOKIE_PASSWORD?.length).toBeGreaterThanOrEqual(
      32
    );
  },

  validateRequiredEnvVars: (vars: string[]) => {
    vars.forEach((varName) => {
      expect(process.env[varName]).toBeDefined();
    });
  },

  withMockedEnv: (
    envVars: Record<string, string>,
    testFn: () => void | Promise<void>
  ) => {
    const originalVars: Record<string, string | undefined> = {};

    beforeEach(() => {
      // Store original values
      Object.keys(envVars).forEach((key) => {
        originalVars[key] = process.env[key];
        process.env[key] = envVars[key];
      });
      jest.resetModules();
    });

    afterEach(() => {
      // Restore original values
      Object.keys(originalVars).forEach((key) => {
        if (originalVars[key] === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = originalVars[key];
        }
      });
      jest.resetModules();
    });

    return testFn;
  },
};

/**
 * Environment testing utilities
 * Provides helpers for testing environment configuration and setup
 */

/**
 * Helper to create environment variable tests
 */
export function createEnvironmentTests(expectedVars: Record<string, string>) {
  Object.entries(expectedVars).forEach(([key, value]) => {
    it(`should have ${key} environment variable`, () => {
      expect(process.env[key]).toBe(value);
    });
  });
}

/**
 * Performance test helpers
 */
export const PerformanceHelpers = {
  measureExecutionTime: async <T>(
    fn: () => Promise<T> | T,
    maxTimeMs: number = 100
  ): Promise<T> => {
    const startTime = Date.now();
    const result = await fn();
    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(maxTimeMs);
    return result;
  },

  createLargeTestData: (size: number, template: any) => {
    return Array.from({ length: size }, (_, i) => ({
      ...template,
      id: i,
      name: `${template.name}-${i}`,
    }));
  },
};

const environmentHelpers = {
  EnvironmentHelpers,
  createEnvironmentTests,
  PerformanceHelpers,
};

export default environmentHelpers;
