// @ts-check
import node from "@astrojs/node";
import { defineConfig, envField } from "astro/config";

export default defineConfig({
  // Pages are built on request, so the build holds no health data
  output: "server",
  adapter: node({ mode: "standalone" }),
  env: {
    schema: {
      // Server secret, never bundled into client code
      GARMIN_API_KEY: envField.string({ context: "server", access: "secret" }),
    },
  },
  devToolbar: { enabled: false },
});
