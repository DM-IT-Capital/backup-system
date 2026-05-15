import { ControlPlane } from "@/app/control-plane";
import { getControlPlaneStore } from "@/lib/control-plane-data";
import { hasSupabaseConfig } from "@/lib/supabase/config";

export default async function ServersPage() {
  const store = await getControlPlaneStore();
  return <ControlPlane initialView="servers" initialStore={store} enableLocalPersistence={!hasSupabaseConfig()} />;
}
