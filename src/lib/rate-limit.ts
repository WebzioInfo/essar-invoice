export interface RateLimitOptions {
  interval: number; // in ms
  uniqueTokenPerInterval: number; // Max users per interval
}

export const rateLimit = (options: RateLimitOptions) => {
  const tokenCache = new Map<string, number[]>();

  return {
    check: (res: Response | any, limit: number, token: string) =>
      new Promise<void>((resolve, reject) => {
        const now = Date.now();
        const tokenCount = tokenCache.get(token) || [0];
        
        // Cleanup old tokens
        if (tokenCount[1] && now - tokenCount[1] > options.interval) {
          tokenCount[0] = 0;
        }

        if (tokenCount[0] >= limit) {
          reject();
        } else {
          tokenCount[0] += 1;
          tokenCount[1] = now;
          tokenCache.set(token, tokenCount);
          
          // Prune cache if it gets too big
          if (tokenCache.size > options.uniqueTokenPerInterval) {
              const keys = Array.from(tokenCache.keys());
              tokenCache.delete(keys[0]);
          }

          resolve();
        }
      }),
  };
};
