'use client';

import { useEffect, useState } from 'react';
import { enableGyro, needsGyroPermission } from './tilt';

/** iPhone only: the gyroscope needs an explicit tap before Safari will share it. */
export function GyroButton({ label, className = '' }: { label: string; className?: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => setShow(needsGyroPermission()), []);
  if (!show) return null;
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        if (await enableGyro()) setShow(false);
      }}
    >
      <span aria-hidden="true">⟲ </span>
      {label}
    </button>
  );
}
