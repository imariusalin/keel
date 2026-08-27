import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Mail, Plus } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  createMailbox,
  deleteMailbox,
  listMailDns,
  listMailboxes,
  toggleMailbox,
} from "@/lib/panel/server";
import { formatBytes } from "@/lib/utils";

export const Route = createFileRoute("/_panel/mail")({
  loader: async () => {
    const [boxes, dns] = await Promise.all([listMailboxes(), listMailDns()]);
    return { boxes, dns };
  },
  component: MailPage,
});

function MailPage() {
  const { boxes, dns } = Route.useLoaderData();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [quota, setQuota] = useState("2048");
  const [busy, setBusy] = useState(false);

  async function onCreate() {
    setBusy(true);
    try {
      await createMailbox({
        data: { address, quotaMb: Number(quota) || 2048 },
      });
      toast.success("Mailbox created — MX, SPF, DKIM, DMARC records written");
      setOpen(false);
      setAddress("");
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create mailbox");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        kicker="Mail"
        title="Mailboxes"
        description="Creating a mailbox writes MX, SPF, DKIM, and DMARC for that domain. Point the domain’s nameservers here, or copy the records to your DNS host."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            New mailbox
          </Button>
        }
      />

      {dns.length > 0 ? (
        <div className="mb-6 grid gap-3">
          {dns.map((zone) => (
            <Card key={zone.domain}>
              <CardContent className="p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{zone.domain} DNS</p>
                  <Badge variant={zone.records.every((r) => r.present) ? "ok" : "warn"}>
                    {zone.records.filter((r) => r.present).length}/{zone.records.length} records
                  </Badge>
                </div>
                <ul className="space-y-2 font-mono text-xs">
                  {zone.records.map((rec) => (
                    <li
                      key={`${rec.type}-${rec.name}`}
                      className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3"
                    >
                      <span className="w-16 shrink-0 text-muted-foreground">{rec.type}</span>
                      <span className="w-28 shrink-0">{rec.name}</span>
                      <span className="min-w-0 flex-1 truncate">{rec.value}</span>
                      <Badge variant={rec.present ? "ok" : "warn"}>
                        {rec.present ? "set" : "missing"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="mb-6">
          <CardContent className="p-5 text-sm text-muted-foreground">
            Add a mailbox and Keel will detect the domain, then write the mail DNS records automatically.
          </CardContent>
        </Card>
      )}

      {boxes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Mail className="size-6 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No mailboxes yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {boxes.map((box) => {
            const used = Math.min(100, Math.round((box.usedMb / box.quotaMb) * 100));
            return (
              <Card key={box.id}>
                <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{box.address}</p>
                      <Badge variant={box.status === "active" ? "ok" : "default"}>
                        {box.status}
                      </Badge>
                    </div>
                    <div className="mt-2 max-w-sm">
                      <Progress value={used} />
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                        {formatBytes(box.usedMb)} of {formatBytes(box.quotaMb)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={box.status === "active"}
                      onCheckedChange={(v) =>
                        void toggleMailbox({
                          data: { id: box.id, status: v ? "active" : "disabled" },
                        }).then(() => router.invalidate())
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        void deleteMailbox({ data: { id: box.id } }).then(() =>
                          router.invalidate(),
                        )
                      }
                    >
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New mailbox</DialogTitle>
            <DialogDescription>
              Keel writes MX, A, SPF, DKIM, and DMARC for the domain automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="addr">Address</Label>
              <Input
                id="addr"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="hello@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quota">Quota (MB)</Label>
              <Input
                id="quota"
                value={quota}
                onChange={(e) => setQuota(e.target.value)}
                inputMode="numeric"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void onCreate()} disabled={busy || !address}>
              {busy ? "Creating…" : "Create mailbox"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
