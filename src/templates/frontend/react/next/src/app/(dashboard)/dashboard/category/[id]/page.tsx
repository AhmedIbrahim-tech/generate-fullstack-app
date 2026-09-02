"use client";

import { useParams } from "next/navigation";
import CategoryDetailsPage from "@/modules/category/pages/CategoryDetailsPage";

export default function CategoryDetailsRoutePage() {
  const params = useParams<{ id: string }>();
  return <CategoryDetailsPage id={String(params?.id ?? "")} />;
}
