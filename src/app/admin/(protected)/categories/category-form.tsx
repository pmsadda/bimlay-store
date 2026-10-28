"use client";

import { useActionState } from "react";
import { saveCategory } from "./actions";

type CategoryData = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
};

type ParentOption = {
  id: string;
  name: string;
};

type Props = {
  category?: CategoryData;
  parents: ParentOption[];
};

export default function CategoryForm({
  category,
  parents,
}: Props) {
  const [state, formAction, pending] = useActionState(
    saveCategory,
    { error: "", success: "" },
  );

  return (
    <form action={formAction} className="category-form">
      <input
        type="hidden"
        name="id"
        value={category?.id ?? ""}
      />

      <fieldset disabled={pending}>
        <div className="category-form-grid">
          <label>
            <span>Category name</span>
            <input
              name="name"
              defaultValue={category?.name ?? ""}
              placeholder="Example: Men"
              minLength={2}
              maxLength={80}
              required
            />
          </label>

          <label>
            <span>URL slug</span>
            <input
              name="slug"
              defaultValue={category?.slug ?? ""}
              placeholder="Example: men"
              minLength={2}
              maxLength={100}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              autoCapitalize="none"
              spellCheck={false}
              required
            />
          </label>

          <label>
            <span>Parent category</span>
            <select
              name="parentId"
              defaultValue={category?.parentId ?? ""}
            >
              <option value="">None — main category</option>

              {parents
                .filter((parent) => parent.id !== category?.id)
                .map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    {parent.name}
                  </option>
                ))}
            </select>
          </label>

          <label>
            <span>Display order</span>
            <input
              name="sortOrder"
              type="number"
              min={0}
              max={9999}
              step={1}
              defaultValue={category?.sortOrder ?? 0}
              required
            />
          </label>

          <label className="category-full-width">
            <span>Description</span>
            <textarea
              name="description"
              defaultValue={category?.description ?? ""}
              placeholder="A short introduction to this collection"
              maxLength={1000}
              rows={3}
            />
          </label>
        </div>

        <label className="category-checkbox">
          <input
            name="isActive"
            type="checkbox"
            defaultChecked={category?.isActive ?? true}
          />
          <span>Active category</span>
        </label>

        <p className="category-help">
          Lower display order appears first. Slugs must be unique.
        </p>

        <button
          type="submit"
          className="primary-button"
          disabled={pending}
        >
          {pending
            ? "Saving..."
            : category
              ? "Save changes"
              : "Create category"}
        </button>
      </fieldset>

      <div aria-live="polite" aria-atomic="true">
        {state.error && (
          <p className="admin-form-error">{state.error}</p>
        )}

        {state.success && (
          <p className="category-success">{state.success}</p>
        )}
      </div>
    </form>
  );
}