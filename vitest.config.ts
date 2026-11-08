import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src"), "server-only": path.resolve(__dirname, "test/server-only-stub.ts") } },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    testTimeout: 30000,
    env: { FIELD_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"), AUTH_SECRET: "test-secret-test-secret-test" },
  },
});
