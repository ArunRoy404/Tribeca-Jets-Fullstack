import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // A name used but never imported is a crash on the page that reaches it,
    // and the build does not catch it. `lib/lead.js` re-exported
    // `formatMoney` without importing it, so Leads & Agents and Trip
    // Requests passed every build and threw "formatMoney is not defined"
    // in the browser.
    rules: { "no-undef": "error" },
  },
]);

export default eslintConfig;
