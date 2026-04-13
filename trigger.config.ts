import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "essar-invoice",
  runtime: "node",
  logLevel: "log",
  // The directories where your Trigger.dev tasks are located
  dirs: ["./src/trigger"],
});
