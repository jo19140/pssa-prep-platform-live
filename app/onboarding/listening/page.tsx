import { DialectOnboardingFlow } from "@/components/literacy/DialectOnboardingFlow";
import { SynesisPageShell } from "@/components/synesis/SynesisPageShell";

export default function ListeningOnboardingPage() {
  return (
    <SynesisPageShell roles={["STUDENT", "PARENT"]}>
      <DialectOnboardingFlow />
    </SynesisPageShell>
  );
}
