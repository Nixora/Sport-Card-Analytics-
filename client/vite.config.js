import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "..", "");
  /** Dev server + `vite preview` proxy: where Express runs (e.g. VPS). Not baked into the client bundle. */
  const apiProxyTarget =
    env.API_PROXY_TARGET || env.VITE_API_URL || "http://127.0.0.1:5000";
  return {
    plugins: [react()],
    envDir: "..",
    server: {
      host: true,
      port: 5173,
      strictPort: false,
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: true,
      port: 4173,
      strictPort: false,
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
