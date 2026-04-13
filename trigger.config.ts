import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "essar-invoice", // Change this to your Trigger.dev project ID
  runtime: "node",
  logLevel: "log",
  maxDuration: 300, // 5 minutes max per task run
  // The directories where your Trigger.dev tasks are located
  dirs: ["./src/trigger"],
});
