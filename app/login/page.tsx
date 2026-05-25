import { LoginForm } from "@/components/LoginForm";
import { SynesisAuthShell } from "@/components/synesis/SynesisAuthShell";

export default function LoginPage() {
  return (
    <SynesisAuthShell>
      <LoginForm />
    </SynesisAuthShell>
  );
}
