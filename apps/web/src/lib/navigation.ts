/** @jsxImportSource octane */
import { useNavigate, useSearch } from "@octanejs/tanstack-router";
import type { AppSearch, BoardSearch, SwimlaneMode } from "./route-search";
import { parseAppSearch, parseBoardSearch, swimlaneMode } from "./route-search";

export function useAppSearch(): AppSearch {
  const raw = useSearch({ strict: false }) as Record<string, unknown>;
  return parseAppSearch(raw);
}

export function useBoardSearch(): BoardSearch & { swimlaneMode: SwimlaneMode } {
  const raw = useSearch({ strict: false }) as Record<string, unknown>;
  const board = parseBoardSearch(raw);
  return { ...board, swimlaneMode: swimlaneMode(board) };
}

function patchSearch(
  navigate: ReturnType<typeof useNavigate>,
  patch: (prev: Record<string, unknown>) => Record<string, unknown>,
  replace = false,
) {
  void (navigate as (opts: Record<string, unknown>) => unknown)({
    search: patch,
    replace,
  });
}

export function useIssueNav() {
  const navigate = useNavigate();

  function openIssue(id: string) {
    patchSearch(navigate, (prev) => ({ ...prev, issue: id }));
  }

  function closeIssue() {
    patchSearch(navigate, (prev) => {
      const next = { ...prev };
      delete next.issue;
      return next;
    });
  }

  return { openIssue, closeIssue };
}

export function useBoardFilterNav() {
  const navigate = useNavigate();

  function patchBoardSearch(patch: Partial<BoardSearch>) {
    patchSearch(
      navigate,
      (prev) => {
        const next: Record<string, unknown> = { ...prev, ...patch };
        for (const key of Object.keys(patch) as (keyof BoardSearch)[]) {
          const value = patch[key];
          if (value === undefined || value === "" || value === "none") {
            delete next[key];
          }
        }
        return next;
      },
      true,
    );
  }

  return { patchBoardSearch };
}

export function useSidebarNav() {
  const navigate = useNavigate();
  const search = useAppSearch();
  const collapsed = search.sidebar === "collapsed";

  function toggleSidebar() {
    patchSearch(
      navigate,
      (prev) => {
        const next = { ...prev };
        if (next.sidebar === "collapsed") delete next.sidebar;
        else next.sidebar = "collapsed";
        return next;
      },
      true,
    );
  }

  function setSidebarCollapsed(value: boolean) {
    patchSearch(
      navigate,
      (prev) => {
        const next = { ...prev };
        if (value) next.sidebar = "collapsed";
        else delete next.sidebar;
        return next;
      },
      true,
    );
  }

  return { collapsed, toggleSidebar, setSidebarCollapsed };
}
