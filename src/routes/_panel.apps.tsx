import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Box, MoreHorizontal, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createApp, deleteApp, listApps, updateApp } from "@/lib/panel/server";
import { NODE_VERSIONS } from "@/lib/panel/types";

export const Route = createFileRoute("/_panel/apps")({
  loader: () => listApps(),
  component: AppsPage,
});

function AppsPage() {
  const apps = Route.useLoaderData();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [nodeVersion, setNodeVersion] = useState("22");
  const [port, setPort] = useState("3000");
  const [entry, setEntry] = useState("server.js");
  const [instances, setInstances] = useState("1");

  async function onCreate() {
    setBusy(true);
    try {
      await createApp({
        data: {
          name,
          domain,
          nodeVersion,
          port: Number(port) || 3000,
          entry,
          instances: Number(instances) || 1,
        },
      });
      toast.success("App started");
      setOpen(false);
      setName("");
      setDomain("");
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start app");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        kicker="Node.js"
        title="Apps"
        description="Reverse-proxied Node processes. Pin a version, scale instances, restart without touching PHP."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            New app
          </Button>
        }
      />

      {apps.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Box className="size-6 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No Node apps yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {apps.map((app) => (
            <Card key={app.id}>
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{app.name}</p>
                    <Badge variant={app.status === "running" ? "ok" : "warn"}>
                      {app.status}
                    </Badge>
                  </div>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {app.domain} · :{app.port} · {app.entry} · {app.instances}× Node{" "}
                    {app.nodeVersion}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={app.nodeVersion}
                    onValueChange={(v) =>
                      void updateApp({ data: { id: app.id, nodeVersion: v } }).then(() =>
                        router.invalidate(),
                      )
                    }
                  >
                    <SelectTrigger className="h-9 w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NODE_VERSIONS.map((v) => (
                        <SelectItem key={v} value={v}>
                          Node {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label="App actions">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          void updateApp({
                            data: {
                              id: app.id,
                              status: app.status === "running" ? "stopped" : "running",
                            },
                          }).then(() => router.invalidate())
                        }
                      >
                        {app.status === "running" ? "Stop" : "Start"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() =>
                          void deleteApp({ data: { id: app.id } }).then(() => {
                            toast.success("App removed");
                            return router.invalidate();
                          })
                        }
                      >
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Node app</DialogTitle>
            <DialogDescription>
              Proxied from nginx. Runs as its own process user.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="app-name">Name</Label>
              <Input id="app-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="app-domain">Domain</Label>
              <Input
                id="app-domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="api.example"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Node</Label>
                <Select value={nodeVersion} onValueChange={setNodeVersion}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NODE_VERSIONS.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  inputMode="numeric"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="entry">Entry</Label>
                <Input
                  id="entry"
                  value={entry}
                  onChange={(e) => setEntry(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="instances">Instances</Label>
                <Input
                  id="instances"
                  value={instances}
                  onChange={(e) => setInstances(e.target.value)}
                  inputMode="numeric"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void onCreate()} disabled={busy || !name || !domain}>
              {busy ? "Starting…" : "Start app"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
