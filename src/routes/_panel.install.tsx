import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { INSTALL_CMD, INSTALL_LINES } from "@/lib/panel/install-cmd";

export const Route = createFileRoute("/_panel/install")({
  component: InstallPage,
});

const STEPS = [
  {
    n: "01",
    title: "Get a VPS",
    body: "Ubuntu 22.04 / 24.04 or Debian 12. One CPU is enough. Fresh disk, public IPv4. 2 GB RAM recommended.",
  },
  {
    n: "02",
    title: "Clone and install",
    body: "SSH in as root. Clone this repo, then sudo bash install.sh. The script detects the OS, installs the stack, locks the firewall, and starts this panel.",
  },
  {
    n: "03",
    title: "Open the panel",
    body: "It prints a URL. Finish hostname, modules, and isolation. Typical run: under five minutes.",
  },
];

function InstallPage() {
  const [copied, setCopied] = useState(false);

  function copy() {
    void navigator.clipboard.writeText(INSTALL_CMD);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div>
      <PageHeader
        kicker="Install"
        title="Five minutes on Ubuntu or Debian"
        description="No control-panel zoo. One script, a default-deny firewall, and site jails from the first vhost."
      />

      <Card>
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start">
          <code className="min-w-0 flex-1 whitespace-pre-wrap font-mono text-sm leading-6">
            {INSTALL_LINES.join("\n")}
          </code>
          <Button variant="secondary" onClick={copy} className="shrink-0">
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </CardContent>
      </Card>

      <ol className="mt-6 grid gap-3 md:grid-cols-3">
        {STEPS.map((step) => (
          <li key={step.n} className="rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
            <p className="font-mono text-xs text-muted-foreground">{step.n}</p>
            <h2 className="mt-3 text-sm font-medium">{step.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
          </li>
        ))}
      </ol>

      <Card className="mt-6">
        <CardContent className="p-5">
          <h2 className="text-sm font-medium">What the installer does</h2>
          <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
            <li>Installs nginx, PHP-FPM 8.1–8.4, Node 18/20/22, Postfix, Dovecot, Bind.</li>
            <li>Creates a keel system user. Sites never run as root.</li>
            <li>Enables UFW: 22, 80, 443, mail, DNS. Everything else stays closed.</li>
            <li>Turns on unattended security upgrades.</li>
            <li>Writes every panel change to this box via sudo keel apply.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
