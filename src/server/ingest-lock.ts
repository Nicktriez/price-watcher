export function isSchedulerEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.DISABLE_INGEST_SCHEDULER !== "1";
}

export interface RunLock {
  tryAcquire(): boolean;
  release(): void;
}

export function createRunLock(): RunLock {
  let running = false;
  return {
    tryAcquire() {
      if (running) return false;
      running = true;
      return true;
    },
    release() {
      running = false;
    },
  };
}
