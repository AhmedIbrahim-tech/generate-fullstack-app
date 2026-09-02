"use client";

import { useParams } from "next/navigation";
import EditCategoryPage from "@/modules/category/pages/EditCategoryPage";

export default function EditCategoryRoutePage() {
  const params = useParams<{ id: string }>();
  return <EditCategoryPage id={String(params?.id ?? "")} />;
}
