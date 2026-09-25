import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// base: "./" keeps the built asset paths relative, which makes the same
// build work on GitHub Pages project sites and any static host.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "./",
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          ethers: ["ethers"],
          qr: ["qrcode", "html5-qrcode"],
        },
      },
    },
  },
});
