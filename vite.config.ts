import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
// GitHub Pages project site: https://<user>.github.io/<repo>/
// Bisa dioverride lewat env VITE_BASE (mis. "/" saat dipakai di domain sendiri).
// Aset di-inline oleh vite-plugin-singlefile sehingga nilai base tidak berpengaruh
// ke path file; aman untuk subfolder GitHub Pages maupun domain sendiri.
const base = process.env.VITE_BASE ?? "/Rumah-Genset-before-after-Design-3D/";

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), viteSingleFile()],
  build: {
    // entry sumber ada di dev.html supaya index.html di root bisa dipakai
    // sebagai hasil build siap-saji untuk GitHub Pages (mode "deploy from branch").
    rollupOptions: { input: path.resolve(__dirname, "dev.html") },
  },
  server: {
    open: "/dev.html",
    host: true,
    // izinkan host preview sandbox (https://<port>-<id>.e2b.app)
    allowedHosts: [".e2b.app", ".arena.ai", "localhost"],
  },
  preview: {
    host: true,
    allowedHosts: [".e2b.app", ".arena.ai", "localhost"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
