/** @jsxImportSource octane */
import { RouterProvider } from "@octanejs/tanstack-router";
import { router } from "./router";
import { SessionProvider } from "./lib/session";

export function App() {
  return (
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>
  );
}
