'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { Pagination } from '@/components/store/Pagination';
import { cn } from '@/lib/cn';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useMe } from '@/lib/hooks/useAuth';
import {
  useAdminContactMessages,
  useDeleteContactMessage,
  useSetContactHandled,
  type ContactMessage,
} from '@/lib/hooks/useAdminContent';

type HandledFilter = 'all' | 'unhandled' | 'handled';

const FILTERS: { value: HandledFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unhandled', label: 'Unhandled' },
  { value: 'handled', label: 'Handled' },
];

function filterToParam(f: HandledFilter): boolean | undefined {
  if (f === 'unhandled') return false;
  if (f === 'handled') return true;
  return undefined;
}

export default function AdminContactPage() {
  const { data: user } = useMe();
  const isAdmin = user?.role === 'ADMIN';
  const { toast } = useToast();

  const [filter, setFilter] = useState<HandledFilter>('all');
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<ContactMessage | null>(null);

  const { data, isLoading, isError, refetch } = useAdminContactMessages(
    { handled: filterToParam(filter), page },
    isAdmin,
  );

  const setHandled = useSetContactHandled();
  const remove = useDeleteContactMessage();

  const onToggleHandled = (m: ContactMessage) => {
    setHandled.mutate(
      { id: m.id, handled: !m.handled },
      {
        onSuccess: () =>
          toast({ variant: 'success', title: m.handled ? 'Marked unhandled' : 'Marked handled' }),
        onError: (e) =>
          toast({
            variant: 'error',
            title: 'Action failed',
            description: e instanceof ApiError ? e.message : undefined,
          }),
      },
    );
  };

  const onDelete = (m: ContactMessage) => {
    if (!window.confirm('Delete this message?')) return;
    remove.mutate(m.id, {
      onSuccess: () => {
        toast({ variant: 'success', title: 'Message deleted' });
        setViewing((v) => (v?.id === m.id ? null : v));
      },
      onError: (e) =>
        toast({
          variant: 'error',
          title: 'Delete failed',
          description: e instanceof ApiError ? e.message : undefined,
        }),
    });
  };

  const setActiveFilter = (next: HandledFilter) => {
    setFilter(next);
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-tight text-ink">Contact inbox</h1>
        {data?.meta && (
          <p className="mt-1 text-[13px] text-muted">
            {data.meta.total} message{data.meta.total === 1 ? '' : 's'}
            {filter === 'all' ? '' : ` (${filter})`}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter messages">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setActiveFilter(f.value)}
            aria-pressed={filter === f.value}
            className={cn(
              'rounded-full px-4 py-2 text-[13px] font-semibold transition-colors',
              filter === f.value
                ? 'bg-brand-600 text-white'
                : 'border border-line bg-surface text-ink-soft hover:bg-paper-2',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No messages" description="No messages match the current filter." />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-[var(--shadow-card)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-paper-2 text-left text-[11px] font-bold uppercase tracking-[0.05em] text-muted">
                  <th className="px-[18px] py-3 font-bold">From</th>
                  <th className="px-[18px] py-3 font-bold">Subject</th>
                  <th className="px-[18px] py-3 font-bold">Received</th>
                  <th className="px-[18px] py-3 font-bold">Status</th>
                  <th className="px-[18px] py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line-soft)]">
                {data.data.map((m) => (
                  <tr
                    key={m.id}
                    className={cn('align-top transition-colors hover:bg-paper-2', m.handled && 'opacity-60')}
                  >
                    <td className="px-[18px] py-3">
                      <div className="font-bold text-ink">{m.name}</div>
                      <div className="text-xs text-muted">{m.email}</div>
                    </td>
                    <td className="px-[18px] py-3">
                      <button
                        onClick={() => setViewing(m)}
                        className="text-left font-semibold text-brand-700 dark:text-brand-300 hover:underline"
                      >
                        {m.subject}
                      </button>
                    </td>
                    <td className="px-[18px] py-3 text-ink-soft">{formatDate(m.createdAt)}</td>
                    <td className="px-[18px] py-3">
                      <Badge tone={m.handled ? 'brand' : 'warning'} dot>
                        {m.handled ? 'Handled' : 'New'}
                      </Badge>
                    </td>
                    <td className="px-[18px] py-3">
                      <div className="flex justify-end gap-3.5 font-semibold">
                        <button
                          onClick={() => setViewing(m)}
                          className="text-brand-600 dark:text-brand-300 hover:underline"
                        >
                          View
                        </button>
                        <button
                          onClick={() => onToggleHandled(m)}
                          disabled={setHandled.isPending}
                          className="text-muted hover:text-ink"
                        >
                          {m.handled ? 'Unhandle' : 'Mark handled'}
                        </button>
                        <button
                          onClick={() => onDelete(m)}
                          disabled={remove.isPending}
                          className="text-[color:var(--color-danger)] hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.meta.totalPages > 1 && (
            <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onPageChange={setPage} />
          )}
        </div>
      )}

      {viewing && (
        <Modal open onClose={() => setViewing(null)} title={viewing.subject} className="max-w-xl">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-bold text-ink">{viewing.name}</p>
                <a
                  href={`mailto:${viewing.email}`}
                  className="text-[13px] text-brand-600 dark:text-brand-300 hover:underline"
                >
                  {viewing.email}
                </a>
              </div>
              <Badge tone={viewing.handled ? 'brand' : 'warning'} dot>
                {viewing.handled ? 'Handled' : 'New'}
              </Badge>
            </div>
            <p className="text-xs text-muted">Received {formatDate(viewing.createdAt)}</p>
            <p className="whitespace-pre-wrap rounded-lg border border-line-soft bg-paper-2/50 p-4 text-sm leading-relaxed text-ink-soft">
              {viewing.body}
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => onToggleHandled(viewing)}
                disabled={setHandled.isPending}
              >
                {viewing.handled ? 'Mark unhandled' : 'Mark handled'}
              </Button>
              <Button variant="danger" onClick={() => onDelete(viewing)} disabled={remove.isPending}>
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
