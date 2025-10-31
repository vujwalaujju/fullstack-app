import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    build: {
      outDir: "build",
      chunkSizeWarningLimit: 2000,
    },
    server: {
      port: 5174,
      strictPort: true,
      host: true,
    },
    preview: {
      port: 5174,
      strictPort: true,
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify(mode),
    },
  };
});
