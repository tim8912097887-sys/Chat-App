import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
  // Global ignore patterns (applies to all configurations)
  {
    ignores: ["dist", "node_modules", "coverage", "build", "eslint.config.mjs"],
  },

  // Base ESLint recommended rules
  eslint.configs.recommended,

  // Recommended TypeScript rules with Type Checking enabled
  ...tseslint.configs.recommendedTypeChecked,

  // Production overrides and custom adjustments
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Allow underscores for unused parameters/variables
      "@typescript-eslint/no-unused-vars": [
        "warn", // Using 'warn' in dev/prod keeps builds flexible while highlighting dead code
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // Permissive Type Rules (Not Too Strict)
      "@typescript-eslint/no-explicit-any": "off", // Allows flexibility when typing complex objects
      "@typescript-eslint/restrict-template-expressions": "off", // Allows ${number} or${boolean} in template literals
      "@typescript-eslint/no-extraneous-class": "off",
      "@typescript-eslint/no-non-null-assertion": "off", // Allows using `!` operator when you know a value exists

      // Smooth handling for async event handlers (e.g. onClick={async () => ...})
      "@typescript-eslint/no-misused-promises": [
        "error",
        {
          checksVoidReturn: false,
        },
      ],

      // Practical production defaults
      "no-console": ["warn", { allow: ["warn", "error"] }], // Warns on console.log, but allows console.warn/error
      "no-debugger": "error",
    },
  },
);
