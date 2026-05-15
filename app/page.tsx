import { ControlPlane } from "@/app/control-plane";
import { getControlPlaneStore } from "@/lib/control-plane-data";
import { hasSupabaseConfig } from "@/lib/supabase/config";

export default async function DashboardPage() {
  const store = await getControlPlaneStore();
  return <ControlPlane initialView="overview" initialStore={store} enableLocalPersistence={!hasSupabaseConfig()} />;
}
