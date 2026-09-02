"use client";

import { useEffect } from "react";
import { useCategoriesController } from "../hooks/useCategoriesController";
import { PageHeader } from "@/shared/components/common/PageHeader";
import { EmptyState } from "@/shared/components/empty-state/EmptyState";
import { ErrorState } from "@/shared/components/empty-state/ErrorState";
import { LoadingState } from "@/shared/components/loaders/LoadingState";

export default function CategoryDetailsPage({ id }: { id: string }) {
  const { selected, status, error, loadById } = useCategoriesController();

  useEffect(() => {
    if (id) {
      loadById(id);
    }
  }, [id, loadById]);

  return (
    <main className="ui-container ui-page" style={{ paddingTop: "2.5rem", paddingBottom: "3.5rem" }}>
      <PageHeader
        title={selected?.name ?? "Category details"}
        description="Inspect a single category returned by GET /api/v1/categories/{id}."
        actions={
          <>
            <a href="/dashboard/category" className="ui-btn ui-btn-ghost">
              Back to list
            </a>
            {id ? (
              <a href={`/dashboard/category/${id}/edit`} className="ui-btn ui-btn-primary">
                Edit category
              </a>
            ) : null}
          </>
        }
      />

      {status === "failed" && error ? <ErrorState description={error} /> : null}
      {status === "loading" ? <LoadingState description="Loading category…" /> : null}

      {!selected && status !== "loading" ? (
        <EmptyState title="Category not loaded" description="Load the list and open a category, or check the id in the URL." />
      ) : selected ? (
        <article className="ui-card">
          <dl className="ui-list" style={{ margin: 0 }}>
            <div>
              <dt className="ui-note">Name</dt>
              <dd style={{ margin: "0.2rem 0 0.9rem" }}>{selected.name}</dd>
            </div>
            <div>
              <dt className="ui-note">Description</dt>
              <dd style={{ margin: "0.2rem 0 0.9rem" }}>{selected.description || "—"}</dd>
            </div>
            <div>
              <dt className="ui-note">Created</dt>
              <dd style={{ margin: "0.2rem 0 0" }}>{selected.createdAtUtc || "—"}</dd>
            </div>
          </dl>
        </article>
      ) : null}
    </main>
  );
}
