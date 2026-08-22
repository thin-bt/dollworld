import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const listenHost = "127.0.0.1";
const apiOrigin = "http://127.0.0.1:8787";

export default defineConfig({
  plugins: [react()],
  root: ".",
  build: {
    outDir: "dist/client",
    emptyOutDir: false,
  },
  server: {
    host: listenHost,
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: apiOrigin,
        changeOrigin: false,
      },
    },
  },
});
