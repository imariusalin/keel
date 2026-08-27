import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Check, ChevronRight, Copy, Lock, Puzzle, Server, Shield } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { KeelMark } from "@/components/keel-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { completeSetup, getPanelState } from "@/lib/panel/server";
import { INSTALL_CMD } from "@/lib/panel/install-cmd";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/setup")({
  loader: async () => {
    const state = await getPanelState();
    if (state.settings.setupComplete) throw redirect({ to: "/" });
    return state;
  },
  component: SetupPage,
});

const LOG_LINES = [
  "Detected Debian-family OS",
  "Installing nginx, PHP-FPM 8.1–8.4, Node 22",
  "Hardening SSH and enabling unattended upgrades",
  "Creating isolated site users and PHP pools",
  "Opening 80/443, closing unused ports",
  "Keel is ready",
];

const MODULE_OPTIONS = [
  { slug: "php", name: "PHP", detail: "Four versions, one pool per site" },
  { slug: "node", name: "Node.js", detail: "Process manager + reverse proxy" },
  { slug: "firewall", name: "Firewall", detail: "Default deny, jail on brute force" },
  { slug: "mail", name: "Mail", detail: "Mailboxes with DKIM and SPF" },
  { slug: "dns", name: "DNS", detail: "Authoritative zones" },
];

function SetupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [hostname, setHostname] = useState("panel.keel.local");
  const [isolation, setIsolation] = useState(true);
  const [mods, setMods] = useState<string[]>([
    "php",
    "node",
    "firewall",
    "mail",
    "dns",
  ]);
  const [logCount, setLogCount] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (step !== 0) return;
    if (logCount >= LOG_LINES.length) return;
    const t = window.setTimeout(
      () => setLogCount((n) => n + 1),
      logCount === 0 ? 280 : 420,
    );
    return () => window.clearTimeout(t);
  }, [step, logCount]);

  const installDone = logCount >= LOG_LINES.length;

  const steps = useMemo(
    () => ["Install", "Server", "Modules", "Isolation"],
    [],
  );

  async function finish() {
    setBusy(true);
    try {
      await completeSetup({
        data: {
          hostname: hostname.trim() || "panel.keel.local",
          isolation,
          modules: mods,
        },
      });
      toast.success("Keel is live");
      await navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Setup failed");
      setBusy(false);
    }
  }

  async function skipDemo() {
    setBusy(true);
    try {
      await completeSetup({
        data: {
          hostname: "panel.keel.local",
          isolation: true,
          modules: ["php", "node", "firewall", "mail", "dns"],
        },
      });
      await navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start demo");
      setBusy(false);
    }
  }

  function copyCmd() {
    void navigator.clipboard.writeText(INSTALL_CMD);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4 py-8 md:py-12">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <KeelMark className="size-7" />
            <span className="text-base font-semibold tracking-tight">Keel</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void skipDemo()} disabled={busy}>
            Explore a demo server
          </Button>
        </header>

        <ol className="mt-10 flex gap-2">
          {steps.map((label, i) => (
            <li key={label} className="flex-1">
              <div
                className={cn(
                  "h-1 rounded-full transition-colors duration-250",
                  i <= step ? "bg-primary" : "bg-secondary",
                )}
              />
              <p
                className={cn(
                  "mt-2 hidden text-[11px] font-medium uppercase tracking-[0.12em] sm:block",
                  i <= step ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </p>
            </li>
          ))}
        </ol>

        <div className="flex flex-1 flex-col justify-center py-10">
          {step === 0 ? (
            <section className="keel-enter">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Five minutes, one command
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
                A hosting panel anyone can install.
              </h1>
              <p className="mt-3 max-w-xl text-muted-foreground">
                Ubuntu 22.04/24.04 or Debian 12. PHP, Node, mail, DNS, and a
                default-deny firewall — isolated per site. Clone the repo on a
                fresh VPS and run the installer.
              </p>
              <div className="mt-8 flex items-center gap-2 rounded-xl bg-card px-4 py-3 font-mono text-sm shadow-[var(--shadow-border)]">
                <span className="min-w-0 flex-1 truncate text-foreground">
                  {INSTALL_CMD}
                </span>
                <Button variant="ghost" size="icon-sm" onClick={copyCmd} aria-label="Copy">
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              </div>
              <div className="mt-4 rounded-xl bg-elevated p-4 font-mono text-xs leading-6 text-muted-foreground">
                {LOG_LINES.slice(0, logCount).map((line) => (
                  <p key={line} className="flex gap-2">
                    <span className="text-ok">ok</span>
                    <span>{line}</span>
                  </p>
                ))}
                {!installDone ? (
                  <p className="text-muted-foreground/70">running…</p>
                ) : null}
              </div>
            </section>
          ) : null}

          {step === 1 ? (
            <section className="keel-enter">
              <Server className="size-6 text-muted-foreground" />
              <h1 className="mt-4 text-3xl font-semibold tracking-tight">
                Name this server.
              </h1>
              <p className="mt-2 max-w-xl text-muted-foreground">
                Used for the panel URL, mail HELO, and certificate names.
              </p>
              <div className="mt-8 max-w-md space-y-2">
                <Label htmlFor="hostname">Hostname</Label>
                <Input
                  id="hostname"
                  value={hostname}
                  onChange={(e) => setHostname(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="keel-enter">
              <Puzzle className="size-6 text-muted-foreground" />
              <h1 className="mt-4 text-3xl font-semibold tracking-tight">
                Pick the stack.
              </h1>
              <p className="mt-2 max-w-xl text-muted-foreground">
                Modules can be added later. Nothing extra is installed.
              </p>
              <ul className="mt-8 grid gap-2">
                {MODULE_OPTIONS.map((mod) => {
                  const on = mods.includes(mod.slug);
                  return (
                    <li key={mod.slug}>
                      <button
                        type="button"
                        onClick={() =>
                          setMods((prev) =>
                            on
                              ? prev.filter((s) => s !== mod.slug)
                              : [...prev, mod.slug],
                          )
                        }
                        className={cn(
                          "flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left transition-colors duration-150",
                          on ? "bg-card shadow-[var(--shadow-border)]" : "bg-secondary",
                        )}
                      >
                        <span>
                          <span className="block text-sm font-medium">{mod.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {mod.detail}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "flex size-5 items-center justify-center rounded-full",
                            on ? "bg-primary text-primary-foreground" : "bg-input",
                          )}
                        >
                          {on ? <Check className="size-3" /> : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {step === 3 ? (
            <section className="keel-enter">
              <Shield className="size-6 text-muted-foreground" />
              <h1 className="mt-4 text-3xl font-semibold tracking-tight">
                Isolate every site.
              </h1>
              <p className="mt-2 max-w-xl text-muted-foreground">
                Each site gets its own system user, PHP-FPM pool, and
                filesystem jail. One compromise cannot walk the box.
              </p>
              <div className="mt-8 flex items-center justify-between rounded-xl bg-card px-4 py-4 shadow-[var(--shadow-border)]">
                <div className="flex items-center gap-3">
                  <Lock className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Site segregation</p>
                    <p className="text-xs text-muted-foreground">
                      Recommended. Can be overridden per site.
                    </p>
                  </div>
                </div>
                <Switch checked={isolation} onCheckedChange={setIsolation} />
              </div>
            </section>
          ) : null}
        </div>

        <footer className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || busy}
          >
            Back
          </Button>
          {step < 3 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 0 && !installDone}
            >
              Continue
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button onClick={() => void finish()} disabled={busy}>
              {busy ? "Starting…" : "Open panel"}
            </Button>
          )}
        </footer>
      </div>
    </div>
  );
}
