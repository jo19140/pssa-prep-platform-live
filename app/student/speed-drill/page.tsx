import { SpeedDrillSession } from "@/components/literacy/SpeedDrillSession";
import { SynesisPageShell } from "@/components/synesis/SynesisPageShell";

export default function StudentSpeedDrillPage() {
  return (
    <SynesisPageShell roles={["STUDENT"]}>
      <SpeedDrillSession />
    </SynesisPageShell>
  );
}
