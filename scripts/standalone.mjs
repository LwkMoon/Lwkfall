// Builds demo/standalone.html
import { readFileSync, writeFileSync } from "node:fs";

const html = readFileSync("demo/index.html", "utf8");
const lib = readFileSync("dist/index.global.js", "utf8");
if (lib.includes("</script")) throw new Error("bundle contains a closing script tag");

const pattern = /<script src="\.\.\/dist\/index\.global\.js"><\/script>\s*<script>[\s\S]*?<\/script>/;
if (!pattern.test(html)) throw new Error("could not find the library script tags in demo/index.html");

const out = html.replace(pattern, () => `<script>${lib}</script>`);
writeFileSync("demo/standalone.html", out);
console.log(`demo/standalone.html written (${Math.round(out.length / 1024)} KB)`);
