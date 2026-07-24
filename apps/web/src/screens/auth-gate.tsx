/** @jsxImportSource octane */
import { Outlet } from "@octanejs/tanstack-router";
import { AuthScreen } from "./auth";
import { useSession } from "../lib/session";
import { SkeletonBlock } from "../components/skeleton";

export function AuthGate() {
  const session = useSession();

  if (session.status === "loading") {
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

  return <Outlet />;
}
