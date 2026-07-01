'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/store/Container';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { PriceTag } from '@/components/ui/PriceTag';
import { Rating } from '@/components/ui/Rating';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { ProductGallery } from '@/components/store/ProductGallery';
import { QuantitySelector } from '@/components/store/QuantitySelector';
import { RecentlyViewed, recordRecentlyViewed } from '@/components/store/RecentlyViewed';
import { RecommendationsSection } from '@/components/store/RecommendationsSection';
import { ReviewsSection } from '@/components/store/ReviewsSection';
import { VariantSelector } from '@/components/store/VariantSelector';
import { cn } from '@/lib/cn';
import { ApiError } from '@/lib/api';
import { signinHref } from '@/lib/authNav';
import { useProduct } from '@/lib/hooks/useProducts';
import { useRelatedProducts } from '@/lib/hooks/useRecommendations';
import { useMe } from '@/lib/hooks/useAuth';
import { useAddToCart } from '@/lib/hooks/useCart';
import { useIsWishlisted, useToggleWishlist } from '@/lib/hooks/useWishlist';
import type { ProductBadge } from '@/lib/types';

const BADGE_TONE: Record<ProductBadge, 'brand' | 'warning' | 'danger' | 'neutral'> = {
  NEW: 'brand',
  SALE: 'danger',
  BESTSELLER: 'warning',
  TRENDING: 'neutral',
};

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: product, isLoading, isError, error, refetch } = useProduct(params.id);
  const related = useRelatedProducts(params.id);
  const { data: user } = useMe();
  const signedIn = Boolean(user);

  const addToCart = useAddToCart();
  const toggleWishlist = useToggleWishlist();
  const wishlisted = useIsWishlisted(params.id, signedIn);
  const { toast } = useToast();

  const [qty, setQty] = useState(1);
  const [variantId, setVariantId] = useState<string | null>(null);

  // Record the view once the product resolves (view history → localStorage, allowed).
  useEffect(() => {
    if (product) recordRecentlyViewed(product.id);
  }, [product]);

  const hasVariants = (product?.variants.length ?? 0) > 0;
  const selectedVariant = useMemo(
    () => product?.variants.find((v) => v.id === variantId) ?? null,
    [product, variantId],
  );

  // Active price/stock reflect the chosen variant when variants exist.
  const activePriceCents = selectedVariant?.priceCents ?? product?.priceCents ?? 0;
  const activeStock = hasVariants ? (selectedVariant?.stock ?? 0) : (product?.stock ?? 0);
  const needsVariant = hasVariants && !selectedVariant;
  const outOfStock = !needsVariant && activeStock <= 0;

  const notFound = isError && error instanceof ApiError && error.status === 404;

  function onAdd() {
    if (!product) return;
    if (!signedIn) {
      toast({ variant: 'default', title: 'Sign in to add to your bag' });
      router.push(signinHref(`/products/${product.id}`));
      return;
    }
    if (needsVariant) {
      toast({ variant: 'error', title: 'Please choose an option first' });
      return;
    }
    addToCart.mutate(
      { productId: product.id, quantity: qty, variantId: selectedVariant?.id },
      {
        onSuccess: () =>
          toast({ variant: 'success', title: 'Added to bag', description: product.name }),
        onError: (err) =>
          toast({
            variant: 'error',
            title: 'Could not add to bag',
            description: err instanceof ApiError ? err.message : undefined,
          }),
      },
    );
  }

  function onToggleWishlist() {
    if (!product) return;
    if (!signedIn) {
      toast({ variant: 'default', title: 'Sign in to save favourites' });
      router.push(signinHref(`/products/${product.id}`));
      return;
    }
    toggleWishlist.mutate(product.id, {
      onSuccess: (res) =>
        toast({
          variant: 'success',
          title: res.wishlisted ? 'Saved to wishlist' : 'Removed from wishlist',
        }),
      onError: () => toast({ variant: 'error', title: 'Could not update wishlist' }),
    });
  }

  return (
    <Container className="py-8">
      {isLoading ? (
        <DetailSkeleton />
      ) : notFound ? (
        <EmptyState
          title="Product not found"
          description="It may have been removed or is no longer available."
          action={
            <Link href="/products">
              <Button variant="secondary">Browse the catalog</Button>
            </Link>
          }
        />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : product ? (
        <>
          <Breadcrumbs
            className="mb-6"
            items={[
              { label: 'Home', href: '/' },
              { label: product.category, href: `/products?category=${encodeURIComponent(product.category)}` },
              { label: product.name },
            ]}
          />

          <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
            <ProductGallery
              images={product.images}
              fallbackUrl={product.imageUrl}
              productName={product.name}
            />

            <div className="flex flex-col">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-[0.07em] text-muted">
                  {product.category}
                </span>
                <button
                  type="button"
                  onClick={onToggleWishlist}
                  disabled={toggleWishlist.isPending}
                  aria-pressed={signedIn ? wishlisted : undefined}
                  aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 text-sm font-semibold transition-colors',
                    'hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                    'disabled:cursor-not-allowed disabled:opacity-60',
                    wishlisted ? 'text-danger' : 'text-ink-soft hover:text-danger',
                  )}
                >
                  <Icon name={wishlisted ? 'heart-filled' : 'heart'} size={16} />
                  {wishlisted ? 'Saved' : 'Save'}
                </button>
              </div>

              <h1 className="mt-2 font-serif text-[32px] font-medium leading-tight tracking-tight text-ink sm:text-[38px]">
                {product.name}
              </h1>

              {product.badges.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {product.badges.map((b) => (
                    <Badge key={b} tone={BADGE_TONE[b]}>
                      {b.charAt(0) + b.slice(1).toLowerCase()}
                    </Badge>
                  ))}
                </div>
              )}

              {product.ratingCount > 0 && (
                <a
                  href="#reviews"
                  className="mt-3 inline-flex w-fit items-center gap-1.5 rounded transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  <Rating value={product.ratingAvg} count={product.ratingCount} size="sm" />
                  <span className="text-sm font-semibold text-brand-600 dark:text-brand-300">
                    Read reviews
                  </span>
                </a>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3.5">
                <PriceTag
                  priceCents={activePriceCents}
                  compareAtPriceCents={product.compareAtPriceCents ?? undefined}
                  showDiscount
                  size="lg"
                />
                {needsVariant ? (
                  <Badge tone="neutral" dot>
                    Select an option
                  </Badge>
                ) : outOfStock ? (
                  <Badge tone="danger" dot>
                    Out of stock
                  </Badge>
                ) : activeStock <= 5 ? (
                  <Badge tone="warning" dot>
                    Only {activeStock} left
                  </Badge>
                ) : (
                  <Badge tone="brand" dot>
                    In stock · {activeStock} available
                  </Badge>
                )}
              </div>

              <p className="mt-5 leading-relaxed text-ink-soft">{product.description}</p>

              {hasVariants && (
                <div className="mt-6">
                  <VariantSelector
                    variants={product.variants}
                    selectedId={variantId}
                    onSelect={setVariantId}
                  />
                </div>
              )}

              <div className="my-7 h-px bg-line" />

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3.5">
                  <QuantitySelector
                    value={qty}
                    onChange={setQty}
                    min={1}
                    max={Math.max(1, activeStock)}
                    disabled={outOfStock || needsVariant}
                    size="lg"
                  />
                  <Button
                    onClick={onAdd}
                    disabled={addToCart.isPending || outOfStock}
                    size="lg"
                    className="flex-1"
                  >
                    <Icon name="bag" size={18} />
                    {addToCart.isPending
                      ? 'Adding…'
                      : outOfStock
                        ? 'Out of stock'
                        : 'Add to bag'}
                  </Button>
                </div>
                {addToCart.isSuccess && !addToCart.isPending && (
                  <p role="status" className="flex items-center gap-2 text-sm text-[color:var(--color-success)]">
                    <Icon name="check-circle" size={16} /> Added to your bag.{' '}
                    <Link href="/cart" className="font-medium underline">
                      View bag
                    </Link>
                  </p>
                )}
              </div>

              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2.5">
                <TrustItem icon="rotate-ccw">Free 30-day returns</TrustItem>
                <TrustItem icon="truck">Dispatched within 24h</TrustItem>
              </div>
            </div>
          </div>

          {/* Detail tabs */}
          <div className="mt-14">
            <Tabs
              items={[
                {
                  value: 'description',
                  label: 'Description',
                  content: (
                    <p className="max-w-2xl leading-relaxed text-ink-soft">{product.description}</p>
                  ),
                },
                {
                  value: 'shipping',
                  label: 'Shipping & returns',
                  content: (
                    <div className="max-w-2xl space-y-3 text-sm leading-relaxed text-ink-soft">
                      <p>
                        Orders are dispatched within 24 hours on business days. Standard delivery
                        arrives in 3–5 working days; you’ll receive tracking by email.
                      </p>
                      <p>
                        Not quite right? Return any unused item within 30 days for a full refund.
                        Returns are free — we’ll cover the postage.
                      </p>
                    </div>
                  ),
                },
                {
                  value: 'reviews',
                  label: `Reviews (${product.ratingCount})`,
                  content: (
                    <div id="reviews" className="scroll-mt-20">
                      <ReviewsSection
                        productId={product.id}
                        ratingAvg={product.ratingAvg}
                        ratingCount={product.ratingCount}
                      />
                    </div>
                  ),
                },
              ]}
            />
          </div>

          {/* Related products */}
          <div className="mt-16">
            <RecommendationsSection
              title="You might also like"
              eyebrow="Related"
              products={related.data?.items}
              isLoading={related.isLoading}
            />
          </div>

          {/* Recently viewed */}
          <div className="mt-16">
            <RecentlyViewed excludeId={product.id} />
          </div>
        </>
      ) : null}
    </Container>
  );
}

function TrustItem({ icon, children }: { icon: 'rotate-ccw' | 'truck'; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink-soft">
      <Icon name={icon} size={16} className="text-brand-500 dark:text-brand-300" />
      {children}
    </span>
  );
}

function DetailSkeleton() {
  return (
    <div>
      <Skeleton className="mb-6 h-4 w-48" />
      <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
