'use client';

import { Perf } from 'r3f-perf';

/** r3f-perf inside the canvas (lab only). */
export default function LabPerf() {
  return <Perf position="top-left" minimal={false} />;
}
