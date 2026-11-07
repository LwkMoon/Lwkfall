import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { index: "src/index.ts", react: "src/react.ts" },
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    minify: true,
    target: "es2020",
    external: ["react"],
  },
  {
    entry: { index: "src/index.ts" },
    format: ["iife"],
    globalName: "Lwkfall",
    minify: true,
    target: "es2020",
    outExtension: () => ({ js: ".global.js" }),
  },
]);
