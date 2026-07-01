import { ToastProvider } from '@/components/ui/Toast';
import { AuthLayout } from '@/components/auth/AuthLayout';

/**
 * Standalone layout for the authentication route group. Unlike `(store)`, it carries no
 * store chrome (header, nav, newsletter, footer) — just the full-viewport split screen.
 * ToastProvider is scoped here so auth pages (reset confirmation, social buttons) can
 * raise notifications without depending on the store layout.
 */
export default function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthLayout>{children}</AuthLayout>
    </ToastProvider>
  );
}
