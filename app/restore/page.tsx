import { ControlPlane } from "@/app/control-plane";
import { getControlPlaneStore } from "@/lib/control-plane-data";
import { hasSupabaseConfig } from "@/lib/supabase/config";

export default async function RestorePage() {
  const store = await getControlPlaneStore();
  return <ControlPlane initialView="restore" initialStore={store} enableLocalPersistence={!hasSupabaseConfig()} />;
}
