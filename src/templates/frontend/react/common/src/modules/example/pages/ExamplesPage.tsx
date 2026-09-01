"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExampleCard } from "../components/ExampleCard";
import { useExamplesController } from "../hooks/useExamplesController";
import {
  createExampleSchema,
  type CreateExampleFormValues,
} from "../schemas/example.schema";
import { PageHeader } from "@/shared/components/common/PageHeader";
import { EmptyState } from "@/shared/components/empty-state/EmptyState";
import { ErrorState } from "@/shared/components/empty-state/ErrorState";
import { LoadingState } from "@/shared/components/loaders/LoadingState";

export default function ExamplesPage() {
  const { items, status, error, load, create } = useExamplesController();
  const form = useForm<CreateExampleFormValues>({
    resolver: zodResolver(createExampleSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  return (
    <main className="ui-container ui-page" style={{ paddingTop: "2.5rem", paddingBottom: "3.5rem" }}>
      <PageHeader
        title="Architecture sample"
        description="Page → controller → service → API client. This slice exists so the generated client has a working module before you add domain features."
        actions={
          <button type="button" className="ui-btn ui-btn-ghost" onClick={() => load({ page: 1, pageSize: 10 })}>
            Load sample
          </button>
        }
      />

      {status === "failed" && error ? <ErrorState description={error} /> : null}
      {status === "loading" ? <LoadingState description="Calling the sample endpoint…" /> : null}

      <form
        className="ui-card"
        style={{ margin: "1.2rem 0" }}
        onSubmit={form.handleSubmit((values) => create(values))}
      >
        <h3>Create a sample record</h3>
        <label className="ui-field">
          Name
          <input className="ui-input" {...form.register("name")} />
        </label>
        <label className="ui-field">
          Description
          <textarea className="ui-input" rows={3} {...form.register("description")} />
        </label>
        <button type="submit" className="ui-btn ui-btn-primary">
          Save
        </button>
      </form>

      {items.length === 0 && status !== "loading" ? (
        <EmptyState
          title="No sample records"
          description="The sample API is optional. Generate a real feature when you are ready to persist domain data."
        />
      ) : (
        <ul className="ui-list">
          {items.map((item) => (
            <li key={item.id}>
              <ExampleCard example={item} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
