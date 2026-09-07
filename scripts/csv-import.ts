// scripts/csv-import.ts
// Usage:
//   npx tsx scripts/csv-import.ts members.csv
//
// CSV columns:
//   name,email,domain,role

import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";

function getEnvValue(name: string): string {
  const envPath = ".env.local";

  try {
    const envFile = readFileSync(envPath, "utf-8");

    const line = envFile
      .split(/\r?\n/)
      .find((line) =>
        line.trim().startsWith(`${name}=`)
      );

    if (!line) {
      return "";
    }

    return line
      .slice(name.length + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  } catch {
    return "";
  }
}

const SUPABASE_URL =
  getEnvValue("VITE_SUPABASE_URL") ||
  process.env.VITE_SUPABASE_URL ||
  "";

const ADMIN_JWT =
  getEnvValue("ADMIN_JWT") ||
  process.env.ADMIN_JWT ||
  "";

interface Row {
  name: string;
  email: string;
  domain: string;
  role: string;
}

async function main() {
  if (!SUPABASE_URL) {
    console.error(
      "Missing VITE_SUPABASE_URL in .env.local"
    );
    process.exit(1);
  }

  if (!ADMIN_JWT) {
    console.error(
      "Missing ADMIN_JWT."
    );
    console.error(
      "Set ADMIN_JWT only when you have a logged-in admin access token."
    );
    process.exit(1);
  }

  const path = process.argv[2];

  if (!path) {
    console.error(
      "Usage: npx tsx scripts/csv-import.ts <file.csv>"
    );
    process.exit(1);
  }

  const rows: Row[] = parse(
    readFileSync(path, "utf-8"),
    {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }
  );

  const results: {
    email: string;
    tempPassword?: string;
    error?: string;
  }[] = [];

  for (const row of rows) {
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/provision-user`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ADMIN_JWT}`,
        },
        body: JSON.stringify({
          name: row.name,
          email: row.email,
          domain: row.domain,
          role: row.role,
        }),
      }
    );

    const body = await res.json();

    if (!res.ok) {
      results.push({
        email: row.email,
        error:
          body?.error ?? "Provisioning failed",
      });

      console.error(
        `FAILED ${row.email}: ${
          body?.error ?? "Provisioning failed"
        }`
      );
    } else {
      results.push({
        email: row.email,
        tempPassword: body.tempPassword,
      });

      console.log(
        `OK ${row.email} temp password: ${body.tempPassword}`
      );
    }
  }

  const failures = results.filter(
    (result) => result.error
  );

  console.log(
    `\nDone. ${
      results.length - failures.length
    } created, ${failures.length} failed.`
  );
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : error
  );

  process.exit(1);
});