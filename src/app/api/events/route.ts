import { eventEmitter } from "@/lib/eventEmitter";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  let controllerRef: ReadableStreamDefaultController | null = null;

  const stream = new ReadableStream({
    start(controller) {
      controllerRef = controller;
      const onUpdate = () => {
        try {
          controller.enqueue(new TextEncoder().encode("data: update\n\n"));
        } catch (err) {
          // Ignore errors, typically means the connection was closed
        }
      };

      eventEmitter.on("update", onUpdate);

      // Send initial heartbeat to establish connection
      try {
        controller.enqueue(new TextEncoder().encode(": heartbeat\n\n"));
      } catch (err) {}

      // Keep connection alive with periodic heartbeats
      const intervalId = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(": heartbeat\n\n"));
        } catch (err) {
          clearInterval(intervalId);
        }
      }, 15000);

      req.signal.addEventListener("abort", () => {
        eventEmitter.off("update", onUpdate);
        clearInterval(intervalId);
        try {
          controller.close();
        } catch (e) {}
      });
    },
    cancel() {
      // Optional cleanup if stream is cancelled by consumer
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
