import { StoreHeader } from '@/components/store/StoreHeader';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <StoreHeader />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line py-8 text-center text-sm text-muted">
        <p>Pine &amp; Parcel — a mini e-commerce demo.</p>
      </footer>
    </div>
  );
}
