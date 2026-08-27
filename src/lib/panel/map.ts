import type {
  Activity,
  DnsRecord,
  DnsZone,
  FirewallRule,
  Mailbox,
  ModuleRow,
  NodeApp,
  Site,
} from "./types";

function iso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return new Date().toISOString();
}

function bool(value: unknown) {
  return value === true || value === "t" || value === "true" || value === 1;
}

function num(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

export function mapSite(row: Record<string, unknown>): Site {
  const status = row.status === "stopped" ? "stopped" : "active";
  return {
    id: num(row.id),
    domain: String(row.domain),
    phpVersion: String(row.php_version),
    root: String(row.root),
    ssl: bool(row.ssl),
    forceHttps: bool(row.force_https),
    isolated: bool(row.isolated),
    systemUser: String(row.jail_user),
    pool: String(row.pool),
    status,
    memoryLimit: String(row.memory_limit),
    createdAt: iso(row.created_at),
  };
}

export function mapApp(row: Record<string, unknown>): NodeApp {
  const status = row.status === "stopped" ? "stopped" : "running";
  return {
    id: num(row.id),
    name: String(row.name),
    domain: String(row.domain),
    nodeVersion: String(row.node_version),
    port: num(row.port),
    status,
    entry: String(row.entry),
    instances: num(row.instances),
    memoryMb: num(row.memory_mb),
    createdAt: iso(row.created_at),
  };
}

export function mapRule(row: Record<string, unknown>): FirewallRule {
  return {
    id: num(row.id),
    direction: row.direction === "out" ? "out" : "in",
    action: row.action === "deny" ? "deny" : "allow",
    protocol:
      row.protocol === "udp" ? "udp" : row.protocol === "any" ? "any" : "tcp",
    port: String(row.port),
    source: String(row.source),
    comment: String(row.comment ?? ""),
    enabled: bool(row.enabled),
  };
}

export function mapMailbox(row: Record<string, unknown>): Mailbox {
  return {
    id: num(row.id),
    address: String(row.address),
    quotaMb: num(row.quota_mb),
    usedMb: num(row.used_mb),
    status: row.status === "disabled" ? "disabled" : "active",
    createdAt: iso(row.created_at),
  };
}

export function mapZone(row: Record<string, unknown>): DnsZone {
  return {
    id: num(row.id),
    name: String(row.name),
    serial: num(row.serial),
    status: String(row.status),
  };
}

export function mapRecord(row: Record<string, unknown>): DnsRecord {
  return {
    id: num(row.id),
    zoneId: num(row.zone_id),
    type: String(row.type),
    name: String(row.name),
    value: String(row.value),
    ttl: num(row.ttl),
    priority: row.priority == null ? null : num(row.priority),
  };
}

export function mapModule(row: Record<string, unknown>): ModuleRow {
  return {
    id: num(row.id),
    slug: String(row.slug),
    name: String(row.name),
    description: String(row.description),
    version: String(row.version),
    enabled: bool(row.enabled),
    core: bool(row.core),
    sortOrder: num(row.sort_order),
  };
}

export function mapActivity(row: Record<string, unknown>): Activity {
  return {
    id: num(row.id),
    kind: String(row.kind),
    message: String(row.message),
    createdAt: iso(row.created_at),
  };
}
