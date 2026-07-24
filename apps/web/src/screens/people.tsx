/** @jsxImportSource octane */
import { useEffect, useState } from "octane";
import { buttonVariants } from "@hydrox/ui";
import { trpc } from "../lib/trpc";
import { FieldError, FormError, FormHint, FormSuccess, labelize } from "../components/form";

export function PeopleView(props: { projectId: string; organizationId: string }) {
  const [members, setMembers] = useState<any[]>([]);
  const [orgUsers, setOrgUsers] = useState<any[]>([]);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<"admin" | "member" | "viewer">("member");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userError, setUserError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const [m, u] = await Promise.all([
      (trpc as any).work.listProjectMembers.query({
        projectId: props.projectId,
      }),
      (trpc as any).work.listOrgUsers.query({
        organizationId: props.organizationId,
      }),
    ]);
    setMembers(m);
    setOrgUsers(u);
    const memberIds = new Set(m.map((x: any) => x.userId));
    const candidate = u.find((x: any) => !memberIds.has(x.id));
    if (candidate) setUserId(candidate.id);
    else setUserId("");
  }

  useEffect(() => {
    void refresh();
  }, [props.projectId, props.organizationId]);

  const memberIds = new Set(members.map((m) => m.userId));
  const candidates = orgUsers.filter((u) => !memberIds.has(u.id));

  return (
    <div class="space-y-5" data-testid="people-view">
      <h1 class="panel-title">People</h1>

      <form
        class="form-panel"
        data-testid="add-member-form"
        noValidate
        onSubmit={(e: any) => {
          e.preventDefault();
          setMessage(null);
          setError(null);
          if (!userId) {
            setUserError("Select a user to add");
            return;
          }
          setUserError(null);
          setBusy(true);
          void (trpc as any).work.addProjectMember
            .mutate({
              projectId: props.projectId,
              userId,
              role,
            })
            .then(() => {
              setMessage("Member added");
              return refresh();
            })
            .catch((err: unknown) => {
              setError(err instanceof Error ? err.message : "Could not add member");
            })
            .finally(() => setBusy(false));
        }}
      >
        <p class="form-panel-title">Add member</p>
        <div class="form-row composer">
          <label class="control-field grow">
            <span class="control-label required">User</span>
            <select
              class={"control" + (userError ? " is-invalid" : "")}
              data-testid="member-user"
              required
              value={userId}
              onChange={(e: any) => {
                setUserId(e.currentTarget.value);
                setUserError(null);
              }}
              disabled={candidates.length === 0}
            >
              <option value="">Select org user</option>
              {candidates.map((u) => (
                <option key={u.id} value={u.id}>
                  {`${u.displayName} (@${u.username})`}
                </option>
              ))}
            </select>
            <FieldError message={userError} />
          </label>
          <label class="control-field">
            <span class="control-label">Role</span>
            <select
              class="control"
              data-testid="member-role"
              value={role}
              onChange={(e: any) => setRole(e.currentTarget.value)}
            >
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
          </label>
          <button
            class={buttonVariants.default}
            type="submit"
            data-testid="add-member"
            disabled={busy || candidates.length === 0}
          >
            {busy ? "Adding…" : "Add member"}
          </button>
        </div>
        {candidates.length === 0 ? (
          <FormHint testId="people-no-candidates">
            Everyone in the organization is already on this project.
          </FormHint>
        ) : null}
        <FormError message={error} />
        <FormSuccess message={message} testId="member-message" />
      </form>

      <ul class="space-y-2" data-testid="members-list">
        {members.map((m) => (
          <li
            key={m.id}
            class="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2"
            data-testid="member-row"
          >
            <div>
              <div class="font-medium">{m.user?.displayName ?? m.userId}</div>
              <div class="text-xs text-muted-foreground">
                {`@${m.user?.username ?? ""} · ${labelize(String(m.role))}`}
              </div>
            </div>
            <button
              class={buttonVariants.ghost}
              type="button"
              data-testid="remove-member"
              onClick={() =>
                void (trpc as any).work.removeProjectMember
                  .mutate({
                    projectId: props.projectId,
                    userId: m.userId,
                  })
                  .then(refresh)
              }
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <FormHint>Role capability overrides live under Settings → Project overrides.</FormHint>
    </div>
  );
}
