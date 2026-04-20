import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: "./",
  build: {
    target: "esnext",
    minify: "terser",
    terserOptions: {
      compress: { drop_console: true },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
          "vendor-ui": ["framer-motion", "lucide-react"],
          "vendor-map": ["maplibre-gl"],
          "vendor-io": ["socket.io-client"],
        },
      },
    },
  },
});
