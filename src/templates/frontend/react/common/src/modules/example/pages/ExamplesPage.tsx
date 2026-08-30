"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Layers } from "lucide-react";
import { ExampleCard } from "../components/ExampleCard";
import { useExamplesController } from "../hooks/useExamplesController";
import {
  createExampleSchema,
  type CreateExampleFormValues,
} from "../schemas/example.schema";

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
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-16">
      <header className="flex items-start gap-3">
        <Layers className="mt-1 h-6 w-6" aria-hidden="true" />
        <div>
          <h1 className="text-3xl font-semibold">Examples</h1>
          <p className="mt-2 text-zinc-600">
            Page → controller hook → async thunk → module service → shared
            apiClient. Thunks live under <code>slices/thunks/</code>. V1 does
            not generate a backend Example endpoint; do not expect these
            requests to succeed until that API exists.
          </p>
        </div>
      </header>

      <div className="flex gap-3">
        <button
          type="button"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white"
          onClick={() => load({ page: 1, pageSize: 10 })}
        >
          Load examples
        </button>
      </div>

      {status === "failed" && error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <form
        className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4"
        onSubmit={form.handleSubmit((values) => create(values))}
      >
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input
            className="rounded-md border border-zinc-300 px-3 py-2"
            {...form.register("name")}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Description
          <textarea
            className="rounded-md border border-zinc-300 px-3 py-2"
            rows={3}
            {...form.register("description")}
          />
        </label>
        <button
          type="submit"
          className="w-fit rounded-md border border-zinc-300 px-4 py-2 text-sm"
        >
          Create example
        </button>
      </form>

      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.id}>
            <ExampleCard example={item} />
          </li>
        ))}
      </ul>
    </main>
  );
}
