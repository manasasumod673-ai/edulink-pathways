import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Protected } from "@/components/edulink/Protected";
import { PageShell } from "@/components/edulink/PageShell";

export const Route = createFileRoute("/app")({
  component: () => (
    <Protected>
      <PageShell>
        <Outlet />
      </PageShell>
    </Protected>
  ),
});