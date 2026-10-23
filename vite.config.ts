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
const base = process.env.VITE_BASE ?? "/Rumah-Genset-before-after-Design-3D/";

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), viteSingleFile()],
  server: {
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
