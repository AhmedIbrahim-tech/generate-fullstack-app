"use client";

import { motion } from "framer-motion";
import type { Example } from "../types/example.types";

export function ExampleCard({ example }: { example: Example }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-zinc-200 p-4"
    >
      <h2 className="text-lg font-medium">{example.name}</h2>
      <p className="mt-2 text-sm text-zinc-600">{example.description}</p>
    </motion.article>
  );
}
