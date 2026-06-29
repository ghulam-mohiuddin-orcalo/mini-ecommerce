import { Button } from '@/components/ui/Button';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="rounded-full bg-brand-100 px-3 py-1 text-sm font-medium text-brand-700">
        Milestone 0 · Scaffold
      </span>
      <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
        Pine &amp; Parcel
      </h1>
      <p className="max-w-prose text-muted">
        A mini e-commerce platform — storefront and admin, one API. The toolchain is wired and
        the design system is live. Features land next, one milestone at a time.
      </p>
      <div className="flex gap-3">
        <Button size="lg">Browse the catalog</Button>
        <Button size="lg" variant="secondary">
          Admin panel
        </Button>
      </div>
    </main>
  );
}
