import { supabase } from './supabaseClient';
import type { UserRole } from '../types/db';

export interface CsvMemberRow {
  name: string;
  email: string;
  domain: string;
  role: UserRole;
}

export interface BulkImportResult {
  ok: boolean;
  batchId?: string;
  totalRows?: number;
  validCount?: number;
  invalidCount?: number;
  insertedCount?: number;
  errors?: Array<{
    rowNumber: number;
    raw: Record<string, unknown>;
    errors: string[];
  }>;
  error?: string;
}

/**
 * Client-side CSV string parser.
 * Handles simple comma-separated lines and quoted values.
 */
export function parseCsvText(csvText: string): CsvMemberRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = lines[0]
    .toLowerCase()
    .split(',')
    .map((h) => h.trim().replace(/^["']|["']$/g, ''));

  const nameIdx = headers.findIndex((h) => h === 'name' || h === 'full_name');
  const emailIdx = headers.findIndex((h) => h === 'email' || h === 'email_address');
  const domainIdx = headers.findIndex((h) => h === 'domain' || h === 'department');
  const roleIdx = headers.findIndex((h) => h === 'role' || h === 'position');

  if (nameIdx === -1 || emailIdx === -1 || domainIdx === -1 || roleIdx === -1) {
    throw new Error('CSV must have headers: name, email, domain, role');
  }

  const rows: CsvMemberRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
    if (cols.length < 4) continue;

    rows.push({
      name: cols[nameIdx] || '',
      email: cols[emailIdx] || '',
      domain: cols[domainIdx] || '',
      role: (cols[roleIdx] || 'member') as UserRole,
    });
  }

  return rows;
}

/**
 * Dispatches parsed CSV rows to the bulk-import-members Supabase Edge Function.
 */
export async function submitBulkImport(
  rows: CsvMemberRow[],
  tenureId?: string
): Promise<BulkImportResult> {
  const { data, error } = await supabase.functions.invoke<BulkImportResult>(
    'bulk-import-members',
    {
      body: { rows, tenureId },
    }
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  return data ?? { ok: false, error: 'No response received from bulk import function' };
}
