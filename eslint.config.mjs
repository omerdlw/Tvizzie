import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const FEATURE_INTERNALS = {
  group: ["@/features/*/**", "!@/features/*/server"],
  message:
    "Import a feature through @/features/<name> or @/features/<name>/server.",
};

function layer(files, banned, message) {
  return {
    files,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            FEATURE_INTERNALS,
            ...(banned.length > 0 ? [{ group: banned, message }] : []),
          ],
        },
      ],
    },
  };
}

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    rules: {
      "@next/next/no-img-element": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
  layer(["src/**/*.{ts,tsx}"], [], ""),
  layer(
    ["src/features/**/*.{ts,tsx}", "src/config/**/*.{ts,tsx}"],
    ["@/app/**"],
    "Features and config cannot depend on the app layer.",
  ),
  layer(
    [
      "src/ui/**/*.{ts,tsx}",
      "src/motion/**/*.{ts,tsx}",
      "src/infrastructure/**/*.{ts,tsx}",
    ],
    ["@/app/**", "@/features", "@/features/**"],
    "ui, motion and infrastructure cannot depend on features or the app layer.",
  ),
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Literal[value=/(^|\\s)-?z-(\\[[^\\]]*\\]|[3-9]\\d|\\d{3,})(\\s|$)/]",
          message:
            "Use Z_INDEX from @omerdlw/base-framework/tokens for layers (z-0/10/20 are fine for local stacking).",
        },
        {
          selector:
            "TemplateElement[value.raw=/(^|\\s)-?z-(\\[[^\\]]*\\]|[3-9]\\d|\\d{3,})(\\s|$)/]",
          message:
            "Use Z_INDEX from @omerdlw/base-framework/tokens for layers (z-0/10/20 are fine for local stacking).",
        },
        {
          selector:
            "Literal[value=/(^|[\\s:])((duration|delay)-[0-9]+|ease-(in|out|in-out))(\\s|$)/]",
          message:
            "Use the motion token classes (duration-fast, ease-out-quart…) from globals.css instead of raw Tailwind timing.",
        },
        {
          selector:
            "TemplateElement[value.raw=/(^|[\\s:])((duration|delay)-[0-9]+|ease-(in|out|in-out))(\\s|$)/]",
          message:
            "Use the motion token classes (duration-fast, ease-out-quart…) from globals.css instead of raw Tailwind timing.",
        },
        {
          selector: "Property[key.name='zIndex'][value.type='Literal']",
          message:
            "Use Z_INDEX from @omerdlw/base-framework/tokens instead of a literal zIndex.",
        },
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
