export const PHP_VERSIONS = ["8.1", "8.2", "8.3", "8.4"] as const;
export const NODE_VERSIONS = ["18", "20", "22"] as const;
export const DNS_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS"] as const;

export type PhpVersion = (typeof PHP_VERSIONS)[number];
export type NodeVersion = (typeof NODE_VERSIONS)[number];
export type DnsType = (typeof DNS_TYPES)[number];

export type ModuleRow = {
  id: number;
  slug: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  core: boolean;
  sortOrder: number;
};

export type Site = {
  id: number;
  domain: string;
  phpVersion: string;
  root: string;
  ssl: boolean;
  forceHttps: boolean;
  isolated: boolean;
  systemUser: string;
  pool: string;
  status: "active" | "stopped";
  memoryLimit: string;
  createdAt: string;
};

export type NodeApp = {
  id: number;
  name: string;
  domain: string;
  nodeVersion: string;
  port: number;
  status: "running" | "stopped";
  entry: string;
  instances: number;
  memoryMb: number;
  createdAt: string;
};

export type FirewallRule = {
  id: number;
  direction: "in" | "out";
  action: "allow" | "deny";
  protocol: "tcp" | "udp" | "any";
  port: string;
  source: string;
  comment: string;
  enabled: boolean;
};

export type Mailbox = {
  id: number;
  address: string;
  quotaMb: number;
  usedMb: number;
  status: "active" | "disabled";
  createdAt: string;
};

export type DnsZone = {
  id: number;
  name: string;
  serial: number;
  status: string;
};

export type DnsRecord = {
  id: number;
  zoneId: number;
  type: string;
  name: string;
  value: string;
  ttl: number;
  priority: number | null;
};

export type Activity = {
  id: number;
  kind: string;
  message: string;
  createdAt: string;
};

export type PanelSettings = {
  hostname: string;
  isolation: boolean;
  setupComplete: boolean;
  sshPort: number;
  autoUpdates: boolean;
};

export type LiveMetrics = {
  cpu: number;
  ram: number;
  disk: number;
  load: number;
  uptimeSec: number;
  spark: number[];
};

export type PanelState = {
  settings: PanelSettings;
  modules: ModuleRow[];
};

export type DashboardData = {
  settings: PanelSettings;
  modules: ModuleRow[];
  metrics: LiveMetrics;
  counts: {
    sites: number;
    apps: number;
    mailboxes: number;
    zones: number;
    firewall: number;
  };
  sites: Site[];
  apps: NodeApp[];
  activity: Activity[];
};
