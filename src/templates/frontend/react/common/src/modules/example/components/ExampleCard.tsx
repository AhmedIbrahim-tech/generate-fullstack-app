"use client";

import { motion } from "framer-motion";
import type { Example } from "../types/example.types";

export function ExampleCard({ example }: { example: Example }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="ui-card"
    >
      <h2 style={{ margin: 0, fontSize: "1.05rem" }}>{example.name}</h2>
      <p className="ui-note" style={{ marginTop: "0.45rem" }}>{example.description}</p>
    </motion.article>
  );
}
