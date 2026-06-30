'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useMe } from '@/lib/hooks/useAuth';
import {
  useAdminContentBlocks,
  useDeleteContentBlock,
  useUpsertContentBlock,
} from '@/lib/hooks/useAdminContent';
import type { ContentBlock } from '@/lib/types';

const textareaClasses =
  'w-full rounded-lg border border-line bg-field px-3.5 py-2.5 text-sm leading-relaxed text-ink transition placeholder:text-muted focus:border-brand-500 focus:bg-surface focus:outline-none focus:ring-[3px] focus:ring-brand-500/15';

type BlockModal =
  | { mode: 'create' }
  | { mode: 'edit'; block: ContentBlock }
  | null;

export default function AdminContentPage() {
  const { data: user } = useMe();
  const isAdmin = user?.role === 'ADMIN';
  const { toast } = useToast();

  const { data, isLoading, isError, refetch } = useAdminContentBlocks(isAdmin);
  const [modal, setModal] = useState<BlockModal>(null);
  const remove = useDeleteContentBlock();

  const onDelete = (block: ContentBlock) => {
    if (!window.confirm(`Delete content block “${block.key}”?`)) return;
    remove.mutate(block.key, {
      onSuccess: () => toast({ variant: 'success', title: 'Block deleted' }),
      onError: (e) =>
        toast({
          variant: 'error',
          title: 'Delete failed',
          description: e instanceof ApiError ? e.message : undefined,
        }),
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-ink">Content</h1>
          <p className="mt-1 text-[13px] text-muted">CMS blocks for static pages</p>
        </div>
        <Button onClick={() => setModal({ mode: 'create' })}>
          <Icon name="plus" size={16} />
          New block
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="No content blocks"
          description="Create a block to manage static page copy."
          action={<Button onClick={() => setModal({ mode: 'create' })}>New block</Button>}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-[var(--shadow-card)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-paper-2 text-left text-[11px] font-bold uppercase tracking-[0.05em] text-muted">
                <th className="px-[18px] py-3 font-bold">Key</th>
                <th className="px-[18px] py-3 font-bold">Title</th>
                <th className="px-[18px] py-3 font-bold">Updated</th>
                <th className="px-[18px] py-3 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-line-soft)]">
              {data.map((block) => (
                <tr key={block.key} className="transition-colors hover:bg-paper-2">
                  <td className="px-[18px] py-3">
                    <code className="rounded bg-paper-2 px-1.5 py-0.5 text-[13px] font-semibold text-ink">
                      {block.key}
                    </code>
                  </td>
                  <td className="px-[18px] py-3 font-semibold text-ink">{block.title}</td>
                  <td className="px-[18px] py-3 text-ink-soft">{formatDate(block.updatedAt)}</td>
                  <td className="px-[18px] py-3">
                    <div className="flex justify-end gap-3.5 font-semibold">
                      <button
                        onClick={() => setModal({ mode: 'edit', block })}
                        className="text-brand-600 dark:text-brand-300 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(block)}
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
      )}

      {modal && <BlockModalForm modal={modal} onClose={() => setModal(null)} />}
    </div>
  );
}

function BlockModalForm({
  modal,
  onClose,
}: {
  modal: { mode: 'create' } | { mode: 'edit'; block: ContentBlock };
  onClose: () => void;
}) {
  const { toast } = useToast();
  const upsert = useUpsertContentBlock();
  const editing = modal.mode === 'edit';

  const [key, setKey] = useState(editing ? modal.block.key : '');
  const [title, setTitle] = useState(editing ? modal.block.title : '');
  const [body, setBody] = useState(editing ? modal.block.body : '');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    upsert.mutate(
      { key: key.trim(), body: { title, body } },
      {
        onSuccess: () => {
          toast({ variant: 'success', title: editing ? 'Block saved' : 'Block created' });
          onClose();
        },
      },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? `Edit “${modal.block.key}”` : 'New content block'}
      className="max-w-2xl"
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <ModalField label="Key">
          <Input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            required
            disabled={editing}
            placeholder="e.g. about, privacy, shipping"
          />
        </ModalField>
        <ModalField label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </ModalField>
        <ModalField label="Body">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={12}
            className={textareaClasses}
          />
        </ModalField>
        {upsert.isError && (
          <p role="alert" className="text-sm text-[color:var(--color-danger)]">
            {upsert.error instanceof ApiError ? upsert.error.message : 'Save failed'}
          </p>
        )}
        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={upsert.isPending}>
            {upsert.isPending ? 'Saving…' : 'Save block'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ModalField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('flex flex-col gap-1.5 text-sm', className)}>
      <span className="font-semibold text-ink">{label}</span>
      {children}
    </label>
  );
}
