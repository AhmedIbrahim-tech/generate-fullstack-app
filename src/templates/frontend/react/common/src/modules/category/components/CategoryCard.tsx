"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import type { Category } from "../types/category.types";

export function CategoryCard({
  category,
  children,
}: {
  category: Category;
  children?: ReactNode;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="ui-card"
    >
      <h2 style={{ margin: 0, fontSize: "1.05rem" }}>{category.name}</h2>
      <p className="ui-note" style={{ marginTop: "0.45rem" }}>{category.description}</p>
      {children}
    </motion.article>
  );
}
