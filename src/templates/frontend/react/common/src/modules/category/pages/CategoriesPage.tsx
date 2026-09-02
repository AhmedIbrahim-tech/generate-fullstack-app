"use client";

import { CategoryCard } from "../components/CategoryCard";
import { useCategoriesController } from "../hooks/useCategoriesController";
import { PageHeader } from "@/shared/components/common/PageHeader";
import { EmptyState } from "@/shared/components/empty-state/EmptyState";
import { ErrorState } from "@/shared/components/empty-state/ErrorState";
import { LoadingState } from "@/shared/components/loaders/LoadingState";

export default function CategoriesPage() {
  const { items, status, error, load } = useCategoriesController();

  return (
    <main className="ui-container ui-page" style={{ paddingTop: "2.5rem", paddingBottom: "3.5rem" }}>
      <PageHeader
        title="Categories"
        description="Group products into named categories. Load the API, then create, inspect, or edit a category."
        actions={
          <>
            <button type="button" className="ui-btn ui-btn-ghost" onClick={() => load({ page: 1, pageSize: 10 })}>
              Load categories
            </button>
            <a href="/dashboard/category/create" className="ui-btn ui-btn-primary">
              Create category
            </a>
          </>
        }
      />

      {status === "failed" && error ? <ErrorState description={error} /> : null}
      {status === "loading" ? <LoadingState description="Loading categories…" /> : null}

      {items.length === 0 && status !== "loading" ? (
        <EmptyState
          title="No categories yet"
          description="Create a category to organize products. The API is /api/v1/categories."
        />
      ) : (
        <ul className="ui-list">
          {items.map((item) => (
            <li key={item.id}>
              <CategoryCard category={item}>
                <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.85rem" }}>
                  <a href={`/dashboard/category/${item.id}`} className="ui-btn ui-btn-ghost">
                    Details
                  </a>
                  <a href={`/dashboard/category/${item.id}/edit`} className="ui-btn ui-btn-ghost">
                    Edit
                  </a>
                </div>
              </CategoryCard>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
