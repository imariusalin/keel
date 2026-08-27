import { getSql } from "@/lib/db";

type BootstrapFile = { email: string; password: string; name?: string };

async function userCount(): Promise<number> {
  const sql = await getSql();
  try {
    const rows = await sql<{ n: number }>`select count(*)::int as n from "user"`;
    return rows[0]?.n ?? 0;
  } catch {
    return 0;
  }
}

async function readBootstrap(): Promise<BootstrapFile | null> {
  const email = process.env.KEEL_ADMIN_EMAIL?.trim();
  const password = process.env.KEEL_ADMIN_PASSWORD?.trim();
  if (email && password) {
    return { email, password, name: "Admin" };
  }
  if (typeof window !== "undefined") return null;
  try {
    const fs = await import("node:fs/promises");
    const raw = await fs.readFile("/var/lib/keel/bootstrap-admin.json", "utf8");
    const parsed = JSON.parse(raw) as BootstrapFile;
    if (parsed.email && parsed.password) return parsed;
  } catch {
    /* no file */
  }
  return null;
}

async function dropBootstrapFile() {
  try {
    const fs = await import("node:fs/promises");
    await fs.unlink("/var/lib/keel/bootstrap-admin.json");
  } catch {
    /* already gone */
  }
}

/** Create the first admin from installer env/file. No-op if a user exists. */
export async function bootstrapAdminIfNeeded(): Promise<void> {
  if (typeof window !== "undefined") return;
  if ((await userCount()) > 0) {
    await dropBootstrapFile();
    return;
  }
  const boot = await readBootstrap();
  if (!boot) return;
  try {
    const { auth } = await import("@/lib/auth/server");
    await auth.api.signUpEmail({
      body: {
        email: boot.email,
        password: boot.password,
        name: boot.name || "Admin",
      },
    });
  } catch (err) {
    console.error("[keel] admin bootstrap:", err);
  }
  await dropBootstrapFile();
  try {
    const fs = await import("node:fs/promises");
    const email = boot.email;
    await fs.writeFile(
      "/var/lib/keel/admin.env",
      `KEEL_ADMIN_EMAIL=${email}\n`,
      { mode: 0o600 },
    );
  } catch {
    /* optional */
  }
}

export async function hasAdminUser(): Promise<boolean> {
  await bootstrapAdminIfNeeded();
  return (await userCount()) > 0;
}
