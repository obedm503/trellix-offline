import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
// import devtools from 'solid-devtools/vite';
import { fileURLToPath, URL } from "node:url";
import { Mode, plugin as markdown } from "vite-plugin-markdown";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({ registerType: "autoUpdate" }),
    markdown({ mode: [Mode.HTML] }),
    /*
    Uncomment the following line to enable solid-devtools.
    For more info see https://github.com/thetarnav/solid-devtools/tree/main/packages/extension#readme
    */
    // devtools(),
    solid(),
  ],
  server: {
    port: 3000,
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
  build: {
    target: "esnext",
  },
  resolve: {
    alias: {
      "lucide-solid/icons": fileURLToPath(
        new URL(
          "../node_modules/lucide-solid/dist/source/icons",
          import.meta.url,
        ),
      ),
    },
  },
});
