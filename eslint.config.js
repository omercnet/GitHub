import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import tseslint from "typescript-eslint";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Next.js recommended rules
  ...compat.extends("next/core-web-vitals"),

  // TypeScript ESLint recommended rules (ESLint 9 compatible)
  ...tseslint.configs.recommended,

  {
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json"],
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // TypeScript specific overrides
      "@typescript-eslint/no-unused-vars": ["error", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",

      // React specific rules (already covered by next/core-web-vitals)
      "react/display-name": "off", // Allow anonymous components

      // General code quality (keep only what's not covered by recommended)
      "no-console": ["warn", { "allow": ["warn", "error"] }],
      "complexity": ["warn", 15],
      "prefer-const": "error",
      "no-var": "error",

      // Security and best practices
      "no-eval": "error",
      "no-implied-eval": "error",
    }
  },

  // Specific overrides for test files
  {
    files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}", "**/__tests__/**/*"],
    languageOptions: {
      parserOptions: {
        project: null, // Disable project-based parsing for test files
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off", // Allow any in tests for mocking
      "@typescript-eslint/no-require-imports": "off", // Allow require in tests
      "no-console": "off", // Allow console in tests
      "@typescript-eslint/no-non-null-assertion": "off", // Allow ! in tests
      "complexity": "off", // Allow complex test scenarios
      "@typescript-eslint/no-unused-vars": "off", // Allow unused vars in tests
    }
  },

  // Specific overrides for API routes
  {
    files: ["app/api/**/*.ts"],
    rules: {
      "no-console": ["warn", { "allow": ["warn", "error", "info"] }], // Allow more logging in API routes
      "@typescript-eslint/no-explicit-any": "warn", // Allow any for API flexibility but warn
    }
  },

  // Specific overrides for configuration files
  {
    files: ["*.config.{js,ts}", "*.setup.{js,ts}"],
    languageOptions: {
      parserOptions: {
        project: null, // Disable project-based parsing for config files
      },
    },
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/no-require-imports": "off"
    }
  }
];

export default eslintConfig;