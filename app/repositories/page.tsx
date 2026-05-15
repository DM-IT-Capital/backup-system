import { ControlPlane } from "@/app/control-plane";
import { getControlPlaneStore } from "@/lib/control-plane-data";
import { hasSupabaseConfig } from "@/lib/supabase/config";

export default async function RepositoriesPage() {
  const store = await getControlPlaneStore();
  return <ControlPlane initialView="repositories" initialStore={store} enableLocalPersistence={!hasSupabaseConfig()} />;
}
