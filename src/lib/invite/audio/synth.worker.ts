/// <reference lib="webworker" />
/**
 * Synthesizes the foley and the placeholder music off the main thread, so preparing sound never
 * blocks the page (each sound is tens of milliseconds of number crunching on a phone).
 */
import { FOLEY, synthesizeFoley } from './foley';
import { renderMusic } from './music';

type Request = { kind: 'foley' } | { kind: 'music'; id: string };

const scope = self as unknown as DedicatedWorkerGlobalScope;

scope.onmessage = async (event: MessageEvent<Request>) => {
  const req = event.data;
  if (req.kind === 'foley') {
    for (const name of FOLEY) {
      const data = synthesizeFoley(name);
      scope.postMessage({ kind: 'foley', name, data }, [data.buffer]);
    }
    scope.postMessage({ kind: 'foley-done' });
  } else {
    const [left, right] = await renderMusic(req.id);
    scope.postMessage({ kind: 'music', left, right }, [left.buffer, right.buffer]);
  }
};
