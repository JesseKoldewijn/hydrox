/** @jsxImportSource octane */
import { createContext, useContext } from "octane";

export type WorkspaceValue = {
  projectId: string;
  organizationId: string;
};

export const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function useWorkspace(): WorkspaceValue {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error("useWorkspace must be used under AppShell");
  }
  return value;
}
