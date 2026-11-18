import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import preact from "@preact/preset-vite";

/** Cada build ganha um cache próprio no service worker: o iPhone troca para a versão nova e limpa a antiga. */
const swVersion = (): Plugin => ({
  name: "sw-version",
  apply: "build",
  writeBundle(opts) {
    const file = resolve(opts.dir ?? "dist", "sw.js");
    const version = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
    writeFileSync(file, readFileSync(file, "utf8").replace('"medidas-v1"', `"medidas-${version}"`));
  },
});

// base "./": funciona tanto no localhost quanto em um subcaminho (ex.: GitHub Pages /peso-medidas/).
export default defineConfig({
  base: "./",
  plugins: [preact(), swVersion()],
  build: { target: "es2020" },
});
