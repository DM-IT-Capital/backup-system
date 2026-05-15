import { ControlPlane } from "@/app/control-plane";
import { getControlPlaneStore } from "@/lib/control-plane-data";
import { hasSupabaseConfig } from "@/lib/supabase/config";

export default async function JobsPage() {
  const store = await getControlPlaneStore();
  return <ControlPlane initialView="jobs" initialStore={store} enableLocalPersistence={!hasSupabaseConfig()} />;
}
