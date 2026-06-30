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
import { useMe } from '@/lib/hooks/useAuth';
import {
  useCreateFaqCategory,
  useCreateFaqItem,
  useDeleteFaqCategory,
  useDeleteFaqItem,
  useFaqTree,
  useUpdateFaqCategory,
  useUpdateFaqItem,
} from '@/lib/hooks/useAdminContent';
import type { FaqCategory, FaqItem } from '@/lib/types';

const textareaClasses =
  'w-full rounded-lg border border-line bg-field px-3.5 py-2.5 text-sm leading-relaxed text-ink transition placeholder:text-muted focus:border-brand-500 focus:bg-surface focus:outline-none focus:ring-[3px] focus:ring-brand-500/15';

type CategoryModal =
  | { mode: 'create' }
  | { mode: 'edit'; category: FaqCategory }
  | null;
type ItemModal =
  | { mode: 'create'; categoryId: string }
  | { mode: 'edit'; item: FaqItem }
  | null;

export default function AdminFaqPage() {
  const { data: user } = useMe();
  const isAdmin = user?.role === 'ADMIN';
  const { toast } = useToast();

  const { data, isLoading, isError, refetch } = useFaqTree(isAdmin);

  const [categoryModal, setCategoryModal] = useState<CategoryModal>(null);
  const [itemModal, setItemModal] = useState<ItemModal>(null);

  const deleteCategory = useDeleteFaqCategory();
  const deleteItem = useDeleteFaqItem();

  const onDeleteCategory = (c: FaqCategory) => {
    if (!window.confirm(`Delete category “${c.name}” and all its questions?`)) return;
    deleteCategory.mutate(c.id, {
      onSuccess: () => toast({ variant: 'success', title: 'Category deleted' }),
      onError: (e) =>
        toast({
          variant: 'error',
          title: 'Delete failed',
          description: e instanceof ApiError ? e.message : undefined,
        }),
    });
  };

  const onDeleteItem = (item: FaqItem) => {
    if (!window.confirm('Delete this question?')) return;
    deleteItem.mutate(item.id, {
      onSuccess: () => toast({ variant: 'success', title: 'Question deleted' }),
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
          <h1 className="text-[28px] font-extrabold tracking-tight text-ink">FAQ</h1>
          <p className="mt-1 text-[13px] text-muted">Manage help categories and questions</p>
        </div>
        <Button onClick={() => setCategoryModal({ mode: 'create' })}>
          <Icon name="plus" size={16} />
          New category
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="No FAQ categories"
          description="Create a category to start adding questions."
          action={<Button onClick={() => setCategoryModal({ mode: 'create' })}>New category</Button>}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {data.map((category) => (
            <section
              key={category.id}
              className="rounded-xl border border-line bg-surface shadow-[var(--shadow-card)]"
            >
              <header className="flex items-center justify-between gap-3 border-b border-line-soft px-5 py-4">
                <div>
                  <h2 className="text-[15px] font-extrabold tracking-tight text-ink">
                    {category.name}
                  </h2>
                  <p className="text-xs text-muted">
                    Position {category.position} · {category.items.length} question
                    {category.items.length === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[13px] font-semibold">
                  <button
                    onClick={() => setItemModal({ mode: 'create', categoryId: category.id })}
                    className="text-brand-600 dark:text-brand-300 hover:underline"
                  >
                    Add question
                  </button>
                  <button
                    onClick={() => setCategoryModal({ mode: 'edit', category })}
                    className="text-muted hover:text-ink"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDeleteCategory(category)}
                    disabled={deleteCategory.isPending}
                    className="text-[color:var(--color-danger)] hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </header>
              {category.items.length === 0 ? (
                <p className="px-5 py-4 text-sm text-muted">No questions yet.</p>
              ) : (
                <ul className="divide-y divide-[var(--color-line-soft)]">
                  {category.items.map((item) => (
                    <li key={item.id} className="flex items-start justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <p className="font-bold text-ink">{item.question}</p>
                        <p className="mt-0.5 line-clamp-2 text-[13px] text-muted">{item.body}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 text-[13px] font-semibold">
                        <span className="text-xs text-faint tabular-nums">#{item.position}</span>
                        <button
                          onClick={() => setItemModal({ mode: 'edit', item })}
                          className="text-brand-600 dark:text-brand-300 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDeleteItem(item)}
                          disabled={deleteItem.isPending}
                          className="text-[color:var(--color-danger)] hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      {categoryModal && (
        <CategoryModalForm modal={categoryModal} onClose={() => setCategoryModal(null)} />
      )}
      {itemModal && <ItemModalForm modal={itemModal} onClose={() => setItemModal(null)} />}
    </div>
  );
}

function CategoryModalForm({
  modal,
  onClose,
}: {
  modal: { mode: 'create' } | { mode: 'edit'; category: FaqCategory };
  onClose: () => void;
}) {
  const { toast } = useToast();
  const create = useCreateFaqCategory();
  const update = useUpdateFaqCategory();
  const editing = modal.mode === 'edit';
  const mutation = editing ? update : create;

  const [name, setName] = useState(editing ? modal.category.name : '');
  const [slug, setSlug] = useState(editing ? modal.category.slug : '');
  const [position, setPosition] = useState(editing ? String(modal.category.position) : '');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      name,
      slug: slug.trim() || undefined,
      position: position.trim() === '' ? undefined : Number(position),
    };
    const onSuccess = () => {
      toast({ variant: 'success', title: editing ? 'Category updated' : 'Category created' });
      onClose();
    };
    if (editing) {
      update.mutate({ id: modal.category.id, body }, { onSuccess });
    } else {
      create.mutate(body, { onSuccess });
    }
  };

  return (
    <Modal open onClose={onClose} title={editing ? 'Edit category' : 'New category'}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <ModalField label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </ModalField>
        <ModalField label="Slug (optional)">
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto if blank" />
        </ModalField>
        <ModalField label="Position">
          <Input
            type="number"
            min={0}
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="Order in list"
          />
        </ModalField>
        {mutation.isError && (
          <p role="alert" className="text-sm text-[color:var(--color-danger)]">
            {mutation.error instanceof ApiError ? mutation.error.message : 'Save failed'}
          </p>
        )}
        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : editing ? 'Save changes' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ItemModalForm({
  modal,
  onClose,
}: {
  modal: { mode: 'create'; categoryId: string } | { mode: 'edit'; item: FaqItem };
  onClose: () => void;
}) {
  const { toast } = useToast();
  const create = useCreateFaqItem();
  const update = useUpdateFaqItem();
  const editing = modal.mode === 'edit';
  const mutation = editing ? update : create;

  const [question, setQuestion] = useState(editing ? modal.item.question : '');
  const [body, setBody] = useState(editing ? modal.item.body : '');
  const [position, setPosition] = useState(editing ? String(modal.item.position) : '');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const onSuccess = () => {
      toast({ variant: 'success', title: editing ? 'Question updated' : 'Question added' });
      onClose();
    };
    const posValue = position.trim() === '' ? undefined : Number(position);
    if (editing) {
      update.mutate(
        { id: modal.item.id, body: { question, body, position: posValue } },
        { onSuccess },
      );
    } else {
      create.mutate(
        { categoryId: modal.categoryId, question, body, position: posValue },
        { onSuccess },
      );
    }
  };

  return (
    <Modal open onClose={onClose} title={editing ? 'Edit question' : 'New question'}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <ModalField label="Question">
          <Input value={question} onChange={(e) => setQuestion(e.target.value)} required />
        </ModalField>
        <ModalField label="Answer">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={5}
            className={textareaClasses}
          />
        </ModalField>
        <ModalField label="Position">
          <Input
            type="number"
            min={0}
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="Order in category"
          />
        </ModalField>
        {mutation.isError && (
          <p role="alert" className="text-sm text-[color:var(--color-danger)]">
            {mutation.error instanceof ApiError ? mutation.error.message : 'Save failed'}
          </p>
        )}
        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : editing ? 'Save changes' : 'Add question'}
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
