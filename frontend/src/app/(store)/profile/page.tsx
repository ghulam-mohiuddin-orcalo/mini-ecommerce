'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Icon, type IconName } from '@/components/ui/Icon';
import { OrderStatusBadge } from '@/components/store/OrderStatusBadge';
import { AddressForm } from '@/components/store/AddressForm';
import { formatDate, formatPrice } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { useMe } from '@/lib/hooks/useAuth';
import { useMyOrders } from '@/lib/hooks/useOrders';
import {
  useAddresses,
  useCreateAddress,
  useUpdateAddress,
  useSetDefaultAddress,
  useDeleteAddress,
  type AddressInput,
} from '@/lib/hooks/useAddresses';
import type { Address, User } from '@/lib/types';

function initialsOf(user: User): string {
  const fromName = user.name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('');
  return (fromName || user.email[0] || '?').toUpperCase();
}

export default function ProfilePage() {
  const { data: user, isLoading: userLoading } = useMe();

  if (userLoading) return <Shell><ProfileSkeleton /></Shell>;

  if (!user) {
    return (
      <Shell>
        <EmptyState
          icon={<Icon name="user" size={28} />}
          title="Sign in to view your profile"
          description="Your account overview, orders, and saved addresses live here."
          action={<Link href="/login"><Button>Sign in</Button></Link>}
        />
      </Shell>
    );
  }

  return <Shell><ProfileContent user={user} /></Shell>;
}

function ProfileContent({ user }: { user: User }) {
  const orders = useMyOrders(true);
  const isAdmin = user.role === 'ADMIN';
  const firstName = user.name.trim().split(/\s+/)[0] || 'there';

  const list = orders.data ?? [];
  const stats = useMemo(() => {
    const completed = list.filter((o) => o.status === 'DELIVERED').length;
    const pending = list.filter((o) => o.status === 'PENDING').length;
    const spent = list
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + o.totalCents, 0);
    return { total: list.length, completed, pending, spent };
  }, [list]);

  const memberSince = useMemo(() => {
    if (list.length === 0) return null;
    const earliest = list.reduce((min, o) => (o.createdAt < min ? o.createdAt : min), list[0].createdAt);
    return formatDate(earliest);
  }, [list]);

  const recentOrders = useMemo(
    () => [...list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 4),
    [list],
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Title + welcome */}
      <div className="pp-rise">
        <h1 className="font-serif text-[32px] font-medium tracking-tight text-ink">My Account</h1>
        <p className="mt-1.5 text-muted">
          Welcome back, {firstName} — your details, orders, and addresses at a glance.
        </p>
      </div>

      {/* Identity hero */}
      <section className="pp-rise relative overflow-hidden rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-card)] sm:p-8">
        <div aria-hidden="true" className="pp-glow-soft pointer-events-none absolute inset-0" />
        <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-brand-600 text-2xl font-extrabold text-white shadow-[var(--shadow-btn)]">
            {initialsOf(user)}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-2xl font-extrabold tracking-tight text-ink">{user.name}</h2>
              <Badge tone={isAdmin ? 'brand' : 'neutral'} dot>
                {isAdmin ? 'Administrator' : 'Customer'}
              </Badge>
            </div>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted">
              <Icon name="mail" size={15} className="text-faint" />
              {user.email}
            </p>
            {memberSince && (
              <p className="mt-1 flex items-center gap-2 text-sm text-muted">
                <Icon name="calendar" size={15} className="text-faint" />
                Member since {memberSince}
              </p>
            )}
          </div>
          <div className="sm:ml-auto">
            <Link href="/settings">
              <Button variant="secondary" size="sm">
                <Icon name="lock" size={15} />
                Account settings
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Account overview */}
      <section>
        <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.07em] text-muted">Account overview</h2>
        {orders.isError ? (
          <ErrorState onRetry={() => void orders.refetch()} />
        ) : orders.isLoading ? (
          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            <StatCard icon="bag" chip="bg-brand-100 text-brand-700 dark:text-brand-300" value={String(stats.total)} label="Total orders" />
            <StatCard icon="check-circle" chip="bg-brand-50 text-[var(--color-success)]" value={String(stats.completed)} label="Delivered" />
            <StatCard icon="clock" chip="bg-[var(--color-warning-soft)] text-[var(--color-warning-ink)]" value={String(stats.pending)} label="Pending" />
            <StatCard icon="wallet" chip="bg-brand-600 text-white" value={formatPrice(stats.spent)} label="Total spent" />
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Personal information */}
        <section className="flex flex-col rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-card)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-extrabold tracking-tight text-ink">Personal information</h2>
          </div>
          <dl className="flex flex-col divide-y divide-[var(--color-line-soft)]">
            <InfoRow icon="user" label="Full name" value={user.name} />
            <InfoRow icon="mail" label="Email address" value={user.email} />
            <InfoRow icon="shield-check" label="Role" value={isAdmin ? 'Administrator' : 'Customer'} />
            <InfoRow icon="calendar" label="Account created" value={memberSince ?? 'Not available'} muted={!memberSince} />
          </dl>
        </section>

        {/* Recent orders */}
        <section className="flex flex-col rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-card)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-extrabold tracking-tight text-ink">Recent orders</h2>
            {recentOrders.length > 0 && (
              <Link href="/orders" className="text-sm font-semibold text-brand-600 dark:text-brand-300 hover:underline">
                View all
              </Link>
            )}
          </div>
          {orders.isError ? (
            <ErrorState onRetry={() => void orders.refetch()} />
          ) : orders.isLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <EmptyState
              title="No orders yet"
              description="When you place an order it will show up here."
              action={<Link href="/products"><Button>Browse the catalog</Button></Link>}
            />
          ) : (
            <ul className="flex flex-col gap-2.5">
              {recentOrders.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/orders/${o.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3.5 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-bold tracking-tight text-ink">#{o.id.slice(-8)}</p>
                      <p className="text-xs text-muted">{formatDate(o.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <OrderStatusBadge status={o.status} />
                      <span className="font-extrabold tabular-nums text-ink">{formatPrice(o.totalCents)}</span>
                      <Icon name="arrow-right" size={15} className="text-faint" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Address book */}
      <AddressBook />
    </div>
  );
}

type ModalState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; address: Address }
  | { kind: 'delete'; address: Address };

function AddressBook() {
  const { toast } = useToast();
  const addresses = useAddresses(true);
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const setDefault = useSetDefaultAddress();
  const deleteAddress = useDeleteAddress();

  const [modal, setModal] = useState<ModalState>({ kind: 'closed' });
  const [pendingDefaultId, setPendingDefaultId] = useState<string | null>(null);

  const list = addresses.data ?? [];

  const closeModal = () => {
    createAddress.reset();
    updateAddress.reset();
    setModal({ kind: 'closed' });
  };

  const handleCreate = (values: AddressInput) => {
    createAddress.mutate(values, {
      onSuccess: () => {
        toast({ variant: 'success', title: 'Address added' });
        closeModal();
      },
    });
  };

  const handleUpdate = (id: string, values: AddressInput) => {
    updateAddress.mutate(
      { id, ...values },
      {
        onSuccess: () => {
          toast({ variant: 'success', title: 'Address updated' });
          closeModal();
        },
      },
    );
  };

  const handleSetDefault = (id: string) => {
    setPendingDefaultId(id);
    setDefault.mutate(id, {
      onSuccess: () => toast({ variant: 'success', title: 'Default address updated' }),
      onError: (err) =>
        toast({
          variant: 'error',
          title: 'Could not set default',
          description: err instanceof ApiError ? err.message : undefined,
        }),
      onSettled: () => setPendingDefaultId(null),
    });
  };

  const handleDelete = (id: string) => {
    deleteAddress.mutate(id, {
      onSuccess: () => {
        toast({ variant: 'success', title: 'Address removed' });
        setModal({ kind: 'closed' });
      },
      onError: (err) =>
        toast({
          variant: 'error',
          title: 'Could not remove address',
          description: err instanceof ApiError ? err.message : undefined,
        }),
    });
  };

  return (
    <section className="rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-card)] sm:p-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-brand-50 text-brand-600 dark:text-brand-300" aria-hidden="true">
            <Icon name="home" size={18} />
          </span>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-ink">Address book</h2>
            <p className="text-sm text-muted">Saved delivery addresses for faster checkout.</p>
          </div>
        </div>
        {list.length > 0 && (
          <Button size="sm" onClick={() => setModal({ kind: 'create' })}>
            <Icon name="plus" size={15} />
            Add address
          </Button>
        )}
      </div>

      {addresses.isError ? (
        <ErrorState onRetry={() => void addresses.refetch()} />
      ) : addresses.isLoading ? (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={<Icon name="home" size={28} />}
          title="No saved addresses"
          description="Add an address to speed through checkout next time."
          action={
            <Button onClick={() => setModal({ kind: 'create' })}>
              <Icon name="plus" size={15} />
              Add address
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {list.map((addr) => (
            <li
              key={addr.id}
              className="flex flex-col gap-3 rounded-xl border border-line bg-paper-2 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold tracking-tight text-ink">{addr.label}</span>
                  {addr.isDefault && (
                    <Badge tone="brand" dot>
                      Default
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-sm leading-relaxed text-ink-soft">
                <p className="font-semibold text-ink">{addr.fullName}</p>
                <p>{addr.line1}</p>
                {addr.line2 && <p>{addr.line2}</p>}
                <p>
                  {addr.city}, {addr.postcode}
                </p>
                <p>{addr.country}</p>
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line-soft pt-3">
                {!addr.isDefault && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetDefault(addr.id)}
                    disabled={setDefault.isPending && pendingDefaultId === addr.id}
                  >
                    <Icon name="check-circle" size={15} />
                    {setDefault.isPending && pendingDefaultId === addr.id ? 'Setting…' : 'Set default'}
                  </Button>
                )}
                <Button variant="secondary" size="sm" onClick={() => setModal({ kind: 'edit', address: addr })}>
                  <Icon name="edit" size={15} />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"
                  onClick={() => setModal({ kind: 'delete', address: addr })}
                >
                  <Icon name="trash" size={15} />
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Create / Edit modal */}
      <Modal
        open={modal.kind === 'create' || modal.kind === 'edit'}
        onClose={closeModal}
        title={modal.kind === 'edit' ? 'Edit address' : 'Add a new address'}
      >
        {(modal.kind === 'create' || modal.kind === 'edit') && (
          <AddressForm
            initial={modal.kind === 'edit' ? modal.address : null}
            pending={modal.kind === 'edit' ? updateAddress.isPending : createAddress.isPending}
            error={modal.kind === 'edit' ? updateAddress.error : createAddress.error}
            onCancel={closeModal}
            onSubmit={(values) =>
              modal.kind === 'edit' ? handleUpdate(modal.address.id, values) : handleCreate(values)
            }
          />
        )}
      </Modal>

      {/* Delete confirm modal */}
      <Modal
        open={modal.kind === 'delete'}
        onClose={() => setModal({ kind: 'closed' })}
        title="Remove address?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal({ kind: 'closed' })} disabled={deleteAddress.isPending}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={deleteAddress.isPending}
              onClick={() => modal.kind === 'delete' && handleDelete(modal.address.id)}
            >
              <Icon name="trash" size={15} />
              {deleteAddress.isPending ? 'Removing…' : 'Remove'}
            </Button>
          </>
        }
      >
        {modal.kind === 'delete' && (
          <p>
            This will permanently remove the{' '}
            <span className="font-semibold text-ink">{modal.address.label}</span> address for{' '}
            <span className="font-semibold text-ink">{modal.address.fullName}</span>. This can’t be undone.
          </p>
        )}
      </Modal>
    </section>
  );
}

function StatCard({
  icon,
  value,
  label,
  chip,
}: {
  icon: IconName;
  value: string;
  label: string;
  chip: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
      <span className={`grid h-10 w-10 place-items-center rounded-[10px] ${chip}`} aria-hidden="true">
        <Icon name={icon} size={18} />
      </span>
      <p className="mt-3 truncate text-[26px] font-extrabold tracking-tight text-ink">{value}</p>
      <p className="mt-0.5 text-[13px] text-muted">{label}</p>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  muted = false,
}: {
  icon: IconName;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-paper-2 text-muted" aria-hidden="true">
        <Icon name={icon} size={16} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <dt className="text-xs font-semibold uppercase tracking-[0.05em] text-muted">{label}</dt>
        <dd className={`truncate text-sm font-semibold ${muted ? 'text-faint' : 'text-ink'}`}>{value}</dd>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</div>;
}

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-32 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
