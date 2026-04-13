import { task, logger } from "@trigger.dev/sdk/v3";

export const helloWorldTask = task({
  id: "hello-world",
  run: async (payload: { message: string }) => {
    logger.log("Hello from Trigger.dev!", { payload });
    
    return {
      status: "success",
      received: payload.message,
    };
  },
});
