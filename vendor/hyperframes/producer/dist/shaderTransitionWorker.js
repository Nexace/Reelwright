// src/services/shaderTransitionWorker.ts
import { parentPort } from "node:worker_threads";
import { TRANSITIONS, crossfade } from "@hyperframes/engine/shader-transitions";
if (!parentPort) {
  console.warn("[shaderTransitionWorker] no parentPort; module loaded on main thread");
} else {
  parentPort.on("message", (msg) => {
    const { shader, bufferA, bufferB, output, width, height, progress } = msg;
    const bufA = Buffer.from(bufferA);
    const bufB = Buffer.from(bufferB);
    const out = Buffer.from(output);
    try {
      const fn = TRANSITIONS[shader] ?? crossfade;
      fn(bufA, bufB, out, width, height, progress);
      const reply = {
        ok: true,
        bufferA,
        bufferB,
        output
      };
      parentPort.postMessage(reply, [bufferA, bufferB, output]);
    } catch (err) {
      const reply = {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        bufferA,
        bufferB,
        output
      };
      parentPort.postMessage(reply, [bufferA, bufferB, output]);
    }
  });
}
