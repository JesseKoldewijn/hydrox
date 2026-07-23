/** @jsxImportSource octane */
import { useState } from "octane";
import { AuthScreen } from "./screens/auth";
import { AppShell } from "./screens/shell";
import { useSession } from "./lib/session";
import { SkeletonBlock } from "./components/skeleton";

export function App() {
  const session = useSession();
  const [boot] = useState(true);

  if (!boot || session.status === "loading") {
    return (
      <div class="hydrox-shell p-8">
        <div class="mx-auto max-w-5xl space-y-4">
          <SkeletonBlock class="h-10 w-48" />
          <SkeletonBlock class="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!session.user) {
    return <AuthScreen onAuthed={session.refresh} />;
  }

  return <AppShell user={session.user} onLogout={session.logout} />;
}
