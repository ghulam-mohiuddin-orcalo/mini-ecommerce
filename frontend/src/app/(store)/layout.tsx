import { StoreHeader } from '@/components/store/StoreHeader';
import { Footer } from '@/components/store/Footer';
import { StoreAccessGuard } from '@/components/store/StoreAccessGuard';
import { CartDrawerProvider } from '@/components/store/CartDrawer';
import { ToastProvider } from '@/components/ui/Toast';
import { BackToTop } from '@/components/ui/BackToTop';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreAccessGuard>
      <ToastProvider>
        <CartDrawerProvider>
          <div className="flex min-h-screen flex-col">
            <StoreHeader />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <BackToTop />
        </CartDrawerProvider>
      </ToastProvider>
    </StoreAccessGuard>
  );
}
