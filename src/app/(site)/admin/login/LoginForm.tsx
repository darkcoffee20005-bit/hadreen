'use client';

import { useActionState } from 'react';
import { ui } from '@/components/ui';
import { loginAction } from '../actions';

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className={`${ui.card} mt-8 space-y-4 p-6 text-start`}>
      <div>
        <label htmlFor="password" className={ui.label}>
          كلمة المرور
        </label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className={ui.input} />
      </div>
      {state?.error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={`${ui.primary} w-full`}>
        {pending ? 'جاري الدخول…' : 'دخول'}
      </button>
    </form>
  );
}
