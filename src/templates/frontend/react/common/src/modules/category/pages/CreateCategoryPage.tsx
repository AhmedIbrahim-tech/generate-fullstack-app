"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCategoriesController } from "../hooks/useCategoriesController";
import {
  createCategorySchema,
  type CreateCategoryFormValues,
} from "../schemas/category.schema";
import { PageHeader } from "@/shared/components/common/PageHeader";
import { ErrorState } from "@/shared/components/empty-state/ErrorState";

export default function CreateCategoryPage() {
  const { status, error, create } = useCategoriesController();
  const form = useForm<CreateCategoryFormValues>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  return (
    <main className="ui-container ui-page" style={{ paddingTop: "2.5rem", paddingBottom: "3.5rem" }}>
      <PageHeader
        title="Create category"
        description="Add a category name and optional description."
        actions={
          <a href="/dashboard/category" className="ui-btn ui-btn-ghost">
            Back to list
          </a>
        }
      />

      {status === "failed" && error ? <ErrorState description={error} /> : null}

      <form
        className="ui-card"
        style={{ margin: "1.2rem 0" }}
        onSubmit={form.handleSubmit((values) => create(values))}
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
          Save category
        </button>
      </form>
    </main>
  );
}
