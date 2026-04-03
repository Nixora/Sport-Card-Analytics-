// vite.config.js
import { defineConfig, loadEnv } from "file:///D:/WORK/2_ASSET/Product/Sports_card_Analytics/client/node_modules/vite/dist/node/index.js";
import react from "file:///D:/WORK/2_ASSET/Product/Sports_card_Analytics/client/node_modules/@vitejs/plugin-react/dist/index.js";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, "..", "");
  const apiTarget = env.VITE_API_URL || "http://127.0.0.1:5000";
  return {
    plugins: [react()],
    envDir: "..",
    server: {
      host: true,
      port: 5173,
      strictPort: false,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true
        }
      }
    },
    preview: {
      host: true,
      port: 4173
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxXT1JLXFxcXDJfQVNTRVRcXFxcUHJvZHVjdFxcXFxTcG9ydHNfY2FyZF9BbmFseXRpY3NcXFxcY2xpZW50XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxXT1JLXFxcXDJfQVNTRVRcXFxcUHJvZHVjdFxcXFxTcG9ydHNfY2FyZF9BbmFseXRpY3NcXFxcY2xpZW50XFxcXHZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi9XT1JLLzJfQVNTRVQvUHJvZHVjdC9TcG9ydHNfY2FyZF9BbmFseXRpY3MvY2xpZW50L3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52IH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3RcIjtcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4ge1xuICBjb25zdCBlbnYgPSBsb2FkRW52KG1vZGUsIFwiLi5cIiwgXCJcIik7XG4gIGNvbnN0IGFwaVRhcmdldCA9IGVudi5WSVRFX0FQSV9VUkwgfHwgXCJodHRwOi8vMTI3LjAuMC4xOjUwMDBcIjtcbiAgcmV0dXJuIHtcbiAgICBwbHVnaW5zOiBbcmVhY3QoKV0sXG4gICAgZW52RGlyOiBcIi4uXCIsXG4gICAgc2VydmVyOiB7XG4gICAgICBob3N0OiB0cnVlLFxuICAgICAgcG9ydDogNTE3MyxcbiAgICAgIHN0cmljdFBvcnQ6IGZhbHNlLFxuICAgICAgcHJveHk6IHtcbiAgICAgICAgXCIvYXBpXCI6IHtcbiAgICAgICAgICB0YXJnZXQ6IGFwaVRhcmdldCxcbiAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gICAgcHJldmlldzoge1xuICAgICAgaG9zdDogdHJ1ZSxcbiAgICAgIHBvcnQ6IDQxNzMsXG4gICAgfSxcbiAgfTtcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUEwVixTQUFTLGNBQWMsZUFBZTtBQUNoWSxPQUFPLFdBQVc7QUFFbEIsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE1BQU07QUFDeEMsUUFBTSxNQUFNLFFBQVEsTUFBTSxNQUFNLEVBQUU7QUFDbEMsUUFBTSxZQUFZLElBQUksZ0JBQWdCO0FBQ3RDLFNBQU87QUFBQSxJQUNMLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxJQUNqQixRQUFRO0FBQUEsSUFDUixRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixZQUFZO0FBQUEsTUFDWixPQUFPO0FBQUEsUUFDTCxRQUFRO0FBQUEsVUFDTixRQUFRO0FBQUEsVUFDUixjQUFjO0FBQUEsUUFDaEI7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ1AsTUFBTTtBQUFBLE1BQ04sTUFBTTtBQUFBLElBQ1I7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
