import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "essar-invoice",
  runtime: "node",
  logLevel: "log",
  maxDuration: 60,
  // The directories where your Trigger.dev tasks are located
  dirs: ["./src/trigger"],
});
