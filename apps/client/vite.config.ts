import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "phaser",
              test: /node_modules[\\/]phaser/,
              priority: 20,
            },
            {
              name: "react-vendor",
              test: /node_modules[\\/](react|react-dom|scheduler|zustand)/,
              priority: 15,
            },
            {
              name: "net-i18n",
              test: /node_modules[\\/](@colyseus|i18next|react-i18next)/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
});
