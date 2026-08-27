import type { Sql } from "@/lib/db";
import {
  mapApp,
  mapMailbox,
  mapModule,
  mapRecord,
  mapRule,
  mapSite,
  mapZone,
} from "./map";
import type { LiveMetrics } from "./types";

export function isVpsApply(): boolean {
  return process.env.KEEL_APPLY === "1";
}

function statePath(): string {
  return process.env.KEEL_STATE ?? "/var/lib/keel/state.json";
}

export async function dumpAndApply(sql: Sql): Promise<void> {
  if (typeof window !== "undefined") return;
  if (!isVpsApply()) return;

  const settingsRows = await sql<Record<string, unknown>>`
    select * from panel_settings where id = 1
  `;
  const s = settingsRows[0];
  const modules = (await sql<Record<string, unknown>>`select slug, enabled from modules`).map(
    mapModule,
  );
  const sites = (await sql<Record<string, unknown>>`select * from sites`).map(mapSite);
  const apps = (await sql<Record<string, unknown>>`select * from node_apps`).map(mapApp);
  const firewall = (await sql<Record<string, unknown>>`select * from firewall_rules`).map(
    mapRule,
  );
  const mailboxes = (await sql<Record<string, unknown>>`select * from mailboxes`).map(
    mapMailbox,
  );
  const zones = (await sql<Record<string, unknown>>`select * from dns_zones`).map(mapZone);
  const records = (await sql<Record<string, unknown>>`select * from dns_records`).map(
    mapRecord,
  );

  const moduleMap: Record<string, boolean> = {};
  for (const m of modules) moduleMap[m.slug] = m.enabled;

  const payload = {
    settings: {
      hostname: s ? String(s.hostname) : "localhost",
      isolation: s ? s.isolation === true || s.isolation === "t" : true,
      sshPort: s ? Number(s.ssh_port) : 22,
      autoUpdates: s ? s.auto_updates === true || s.auto_updates === "t" : true,
    },
    modules: moduleMap,
    sites: sites.map((site) => ({
      domain: site.domain,
      systemUser: site.systemUser,
      pool: site.pool,
      phpVersion: site.phpVersion,
      memoryLimit: site.memoryLimit,
      root: site.root,
      status: site.status,
      isolated: site.isolated,
      ssl: site.ssl,
      forceHttps: site.forceHttps,
    })),
    apps: apps.map((app) => ({
      name: app.name,
      domain: app.domain,
      nodeVersion: app.nodeVersion,
      port: app.port,
      entry: app.entry,
      status: app.status,
    })),
    firewall: firewall.map((rule) => ({
      enabled: rule.enabled,
      action: rule.action,
      protocol: rule.protocol,
      port: rule.port,
      source: rule.source,
    })),
    mailboxes: mailboxes.map((box) => ({
      address: box.address,
      status: box.status,
    })),
    dns: {
      zones: zones.map((zone) => ({
        name: zone.name,
        serial: zone.serial,
        records: records
          .filter((r) => r.zoneId === zone.id)
          .map((r) => ({
            type: r.type,
            name: r.name,
            value: r.value,
            ttl: r.ttl,
            priority: r.priority,
          })),
      })),
    },
  };

  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const dest = statePath();
  await fs.mkdir(path.dirname(dest), { recursive: true });
  const tmp = `${dest}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o640 });
  await fs.rename(tmp, dest);

  const { spawn } = await import("node:child_process");
  await new Promise<void>((resolve, reject) => {
    const child = spawn("sudo", ["-n", "/usr/local/sbin/keel-apply"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let err = "";
    child.stderr.on("data", (chunk: Buffer) => {
      err += chunk.toString();
    });
    child.on("error", (e) => reject(e));
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(err.trim() || `keel-apply exited ${code}`));
    });
  });
}

export async function applyAfterChange(sql: Sql): Promise<void> {
  try {
    await dumpAndApply(sql);
  } catch (err) {
    console.error("[keel] apply failed:", err);
    throw new Error(
      err instanceof Error ? err.message : "Could not apply this change on the server",
    );
  }
}

const sparkRing: number[] = [];

export async function readHostMetrics(): Promise<LiveMetrics | null> {
  if (!isVpsApply()) return null;
  try {
    const fs = await import("node:fs/promises");
    const { promisify } = await import("node:util");
    const { execFile } = await import("node:child_process");
    const execFileAsync = promisify(execFile);

    const uptimeFile = await fs.readFile("/proc/uptime", "utf8");
    const uptimeSec = Math.floor(Number(uptimeFile.split(" ")[0]) || 0);
    const load = Number((await fs.readFile("/proc/loadavg", "utf8")).split(" ")[0]) || 0;
    const mem = await fs.readFile("/proc/meminfo", "utf8");
    const total = Number(/MemTotal:\s+(\d+)/.exec(mem)?.[1] ?? 1);
    const avail = Number(/MemAvailable:\s+(\d+)/.exec(mem)?.[1] ?? 0);
    const ram = Math.round((1 - avail / total) * 1000) / 10;
    const cpuinfo = await fs.readFile("/proc/cpuinfo", "utf8");
    const ncpu = (cpuinfo.match(/^processor/gm) ?? []).length || 1;
    const cpu = Math.round(Math.min(100, (load / ncpu) * 100) * 10) / 10;

    let disk = 0;
    try {
      const { stdout } = await execFileAsync("df", ["-P", "/"]);
      const line = stdout.trim().split("\n")[1] ?? "";
      disk = Number(line.split(/\s+/)[4]?.replace("%", "")) || 0;
    } catch {
      disk = 0;
    }

    sparkRing.push(cpu);
    while (sparkRing.length > 24) sparkRing.shift();
    const spark =
      sparkRing.length >= 24
        ? [...sparkRing]
        : Array.from({ length: 24 }, (_, i) => sparkRing[i] ?? cpu);

    return {
      cpu,
      ram,
      disk,
      load: Math.round(load * 100) / 100,
      uptimeSec,
      spark: spark.map((n) => Math.round(n * 10) / 10),
    };
  } catch (err) {
    console.error("[keel] host metrics:", err);
    return null;
  }
}

export function publicIp(): string {
  return process.env.KEEL_PUBLIC_IP?.trim() || "127.0.0.1";
}
