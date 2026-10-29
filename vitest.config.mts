import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    env: {
      FIREBASE_PROJECT_ID: "demo-utilix",
      FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
      FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
      NEXT_PUBLIC_USE_EMULATORS: "true",
    },
  },
  resolve: {
    alias: {
      "@": rootDir,
      "server-only": path.resolve(rootDir, "tests/mocks/server-only.ts"),
    },
  },
});
