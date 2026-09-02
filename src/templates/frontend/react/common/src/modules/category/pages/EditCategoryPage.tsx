"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCategoriesController } from "../hooks/useCategoriesController";
import {
  createCategorySchema,
  type CreateCategoryFormValues,
} from "../schemas/category.schema";
import { PageHeader } from "@/shared/components/common/PageHeader";
import { EmptyState } from "@/shared/components/empty-state/EmptyState";
import { ErrorState } from "@/shared/components/empty-state/ErrorState";
import { LoadingState } from "@/shared/components/loaders/LoadingState";

export default function EditCategoryPage({ id }: { id: string }) {
  const { selected, status, error, loadById, update } = useCategoriesController();
  const form = useForm<CreateCategoryFormValues>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (id) {
      loadById(id);
    }
  }, [id, loadById]);

  useEffect(() => {
    if (selected) {
      form.reset({
        name: selected.name,
        description: selected.description,
      });
    }
  }, [selected, form]);

  return (
    <main className="ui-container ui-page" style={{ paddingTop: "2.5rem", paddingBottom: "3.5rem" }}>
      <PageHeader
        title="Edit category"
        description="Update the category name or description."
        actions={
          <a href="/dashboard/category" className="ui-btn ui-btn-ghost">
            Back to list
          </a>
        }
      />

      {status === "failed" && error ? <ErrorState description={error} /> : null}
      {status === "loading" && !selected ? <LoadingState description="Loading category…" /> : null}

      {!selected && status !== "loading" ? (
        <EmptyState title="Category not loaded" description="Open a category from the list to edit it." />
      ) : (
        <form
          className="ui-card"
          style={{ margin: "1.2rem 0" }}
          onSubmit={form.handleSubmit((values) => update({ id, ...values }))}
        >
          <label className="ui-field">
            Name
            <input className="ui-input" {...form.register("name")} />
          </label>
          <label className="ui-field">
            Description
            <textarea className="ui-input" rows={3} {...form.register("description")} />
          </label>
          <button type="submit" className="ui-btn ui-btn-primary" disabled={status === "loading"}>
            Save changes
          </button>
        </form>
      )}
    </main>
  );
}
