import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
export default [
  { ignores: ["dist/**", "coverage/**", "node_modules/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,mjs}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, ...globals.worker },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // The compatibility controller is extracted original application source. Its typed boundaries live in services and domain modules.
  {
    files: ["src/legacy/**/*.js"],
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-undef": "off",
      "no-empty": "off",
      "no-useless-escape": "off",
      "no-inner-declarations": "off",
    },
  },
];
