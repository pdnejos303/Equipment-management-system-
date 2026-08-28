import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

// In Next.js dev mode, the global object might not be perfectly shared across all API boundaries
// or might be reset by HMR. A file-based trigger is 100% reliable across processes.
const triggerFile = path.join(process.cwd(), '.sse_trigger');

try {
  if (!fs.existsSync(triggerFile)) {
    fs.writeFileSync(triggerFile, Date.now().toString());
  }
} catch (e) {
  // Ignore
}

const globalForEvents = global as unknown as { 
  eventEmitter: EventEmitter;
  isWatching: boolean;
};

export const eventEmitter = globalForEvents.eventEmitter || new EventEmitter();

// We need a non-overridden emit for the watcher to use to avoid infinite loops
const originalEmit = eventEmitter.emit.bind(eventEmitter);

if (!globalForEvents.isWatching) {
  globalForEvents.isWatching = true;
  try {
    fs.watch(triggerFile, (eventType) => {
      if (eventType === 'change') {
        originalEmit('update');
      }
    });
  } catch (e) {
    console.error("Failed to watch SSE trigger file", e);
  }
}

if (process.env.NODE_ENV !== 'production') {
  globalForEvents.eventEmitter = eventEmitter;
}

// Override emit to touch the file
eventEmitter.emit = (eventName: string | symbol, ...args: any[]) => {
  try {
    fs.writeFileSync(triggerFile, Date.now().toString());
  } catch (e) {
    console.error("Failed to touch SSE trigger file", e);
  }
  return originalEmit(eventName, ...args);
};
