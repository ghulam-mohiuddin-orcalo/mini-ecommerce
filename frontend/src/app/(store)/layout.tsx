import { StoreHeader } from '@/components/store/StoreHeader';
import { StoreAccessGuard } from '@/components/store/StoreAccessGuard';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreAccessGuard>
      <div className="flex min-h-screen flex-col">
        <StoreHeader />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm sm:px-6">
            <p className="text-muted">Pine &amp; Parcel — a mini e-commerce demo.</p>
            <p className="font-semibold text-brand-600">Thoughtfully made goods</p>
          </div>
        </footer>
      </div>
    </StoreAccessGuard>
  );
}
