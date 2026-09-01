import { DashboardHome } from "@/shared/components/marketing/DashboardHome";
import { AppLink } from "@/app/navigation/app-link";

export default function DashboardPage() {
  return <DashboardHome productName="__DISPLAY_NAME__" Link={AppLink} />;
}
