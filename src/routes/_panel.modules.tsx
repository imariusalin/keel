import { createFileRoute, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { listModules, toggleModule } from "@/lib/panel/server";

export const Route = createFileRoute("/_panel/modules")({
  loader: () => listModules(),
  component: ModulesPage,
});

function ModulesPage() {
  const modules = Route.useLoaderData();
  const router = useRouter();

  return (
    <div>
      <PageHeader
        kicker="Server"
        title="Modules"
        description="Enable only what this server needs. You can add more later without reinstalling."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {modules.map((mod) => (
          <Card key={mod.id}>
            <CardContent className="flex items-start justify-between gap-4 p-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-medium">{mod.name}</h2>
                  <Badge variant="outline">v{mod.version}</Badge>
                  {mod.core ? <Badge>core</Badge> : null}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{mod.description}</p>
              </div>
              <Switch
                checked={mod.enabled}
                onCheckedChange={(v) =>
                  void toggleModule({ data: { id: mod.id, enabled: v } })
                    .then(() => {
                      if (mod.slug === "redis" && v) {
                        toast.success("Redis will install and start — it also starts after reboot");
                      }
                      if (mod.slug === "redis" && !v) {
                        toast.message("Redis stopped. Package stays; it will not start on reboot");
                      }
                      return router.invalidate();
                    })
                    .catch((err: unknown) =>
                      toast.error(err instanceof Error ? err.message : "Failed"),
                    )
                }
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
