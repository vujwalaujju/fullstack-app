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
      port: 5173,
      strictPort: true,
      host: true,
      proxy: {
        "/api": {
          target: "http://10.188.10.151:5296",
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, "/api"),
        },
      },
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
