// @ts-check
import { defineConfig, envField } from "astro/config";

export default defineConfig({
  env: {
    schema: {
      // Server secret, never bundled into client code
      GARMIN_API_KEY: envField.string({ context: "server", access: "secret" }),
    },
  },
  devToolbar: { enabled: false },
});
