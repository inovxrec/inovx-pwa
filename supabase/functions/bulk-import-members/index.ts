// ==============================================================================
// INOVX OPS — STREAM A: CSV BULK IMPORT EDGE FUNCTION
// supabase/functions/bulk-import-members/index.ts
//
// Accepts CSV rows of (name, email, domain, role), validates them, and inserts
// into the `pending_imports` table with a generated batch_id.
// Stream C's account provisioning worker consumes pending rows from this table.
// ==============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0';

export interface MemberImportRow {
  name: string;
  email: string;
  domain: string;
  role: string;
}

export interface ValidationError {
  rowNumber: number;
  raw: Record<string, unknown>;
  errors: string[];
}

export interface BulkImportResponse {
  ok: boolean;
  batchId: string;
  totalRows: number;
  validCount: number;
  invalidCount: number;
  insertedCount: number;
  errors: ValidationError[];
}

const ALLOWED_ROLES = new Set(['member', 'admin', 'super_admin', 'faculty']);

const VALID_DOMAINS = new Map<string, string>([
  ['technical', 'technical'],
  ['tech', 'technical'],
  ['management', 'management'],
  ['mgmt', 'management'],
  ['events', 'events'],
  ['event', 'events'],
  ['media & pr', 'media'],
  ['media and pr', 'media'],
  ['media', 'media'],
  ['pr', 'media'],
  ['design', 'design'],
  ['core', 'core'],
  ['core ops', 'core'],
]);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function parseCsv(csvText: string): MemberImportRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  // Parse header
  const headerLine = lines[0].toLowerCase();
  const headers = headerLine.split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));

  const nameIdx = headers.findIndex((h) => h === 'name' || h === 'full_name');
  const emailIdx = headers.findIndex((h) => h === 'email' || h === 'email_address');
  const domainIdx = headers.findIndex((h) => h === 'domain' || h === 'department');
  const roleIdx = headers.findIndex((h) => h === 'role' || h === 'position');

  if (nameIdx === -1 || emailIdx === -1 || domainIdx === -1 || roleIdx === -1) {
    throw new Error(
      `CSV must contain headers: name, email, domain, role. Found: ${headers.join(', ')}`
    );
  }

  const rows: MemberImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const rawCols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
    if (rawCols.length < 4) continue;

    rows.push({
      name: rawCols[nameIdx] || '',
      email: rawCols[emailIdx] || '',
      domain: rawCols[domainIdx] || '',
      role: rawCols[roleIdx] || 'member',
    });
  }

  return rows;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Initialize elevated Supabase admin client for insertion into pending_imports
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse input: either JSON with `rows` or multipart/text CSV
    let rawRows: MemberImportRow[] = [];
    let tenureId: string | null = null;
    let importedBy: string | null = null;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await req.json();
      rawRows = Array.isArray(body.rows) ? body.rows : [];
      tenureId = body.tenureId || null;
      importedBy = body.importedBy || null;
    } else if (contentType.includes('text/csv')) {
      const csvText = await req.text();
      rawRows = parseCsv(csvText);
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file');
      tenureId = (formData.get('tenureId') as string) || null;
      importedBy = (formData.get('importedBy') as string) || null;

      if (file instanceof File) {
        const csvText = await file.text();
        rawRows = parseCsv(csvText);
      } else {
        throw new Error('No file found in multipart form data');
      }
    } else {
      // Fallback attempt to read text
      const csvText = await req.text();
      rawRows = parseCsv(csvText);
    }

    if (!rawRows || rawRows.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No rows found in payload. Provide a CSV file or JSON array under `rows`.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve active tenure if not provided
    if (!tenureId) {
      const { data: activeTenure } = await supabase
        .from('tenures')
        .select('id')
        .eq('is_active', true)
        .maybeSingle();

      if (activeTenure) {
        tenureId = activeTenure.id;
      }
    }

    const batchId = crypto.randomUUID();
    const validRowsToInsert: Array<{
      tenure_id: string | null;
      batch_id: string;
      name: string;
      email: string;
      domain: string;
      role: string;
      status: string;
      imported_by: string | null;
    }> = [];

    const validationErrors: ValidationError[] = [];

    // Validate each row
    rawRows.forEach((row, idx) => {
      const rowNumber = idx + 2; // +1 for 1-indexing, +1 for header row
      const errors: string[] = [];

      const cleanName = (row.name || '').trim();
      const cleanEmail = (row.email || '').trim().toLowerCase();
      const rawDomain = (row.domain || '').trim().toLowerCase();
      const rawRole = (row.role || 'member').trim().toLowerCase();

      if (!cleanName) {
        errors.push('Name is required');
      }

      if (!cleanEmail) {
        errors.push('Email is required');
      } else if (!EMAIL_REGEX.test(cleanEmail)) {
        errors.push(`Invalid email format: ${cleanEmail}`);
      }

      const normalizedDomain = VALID_DOMAINS.get(rawDomain);
      if (!normalizedDomain) {
        errors.push(
          `Unrecognized domain: "${row.domain}". Valid options: Technical, Management, Events, Media & PR, Design`
        );
      }

      if (!ALLOWED_ROLES.has(rawRole)) {
        errors.push(
          `Invalid role: "${row.role}". Valid roles: member, admin, super_admin, faculty`
        );
      }

      if (errors.length > 0) {
        validationErrors.push({
          rowNumber,
          raw: row as unknown as Record<string, unknown>,
          errors,
        });
      } else {
        validRowsToInsert.push({
          tenure_id: tenureId,
          batch_id: batchId,
          name: cleanName,
          email: cleanEmail,
          domain: normalizedDomain!,
          role: rawRole,
          status: 'pending',
          imported_by: importedBy,
        });
      }
    });

    // Bulk insert valid rows into pending_imports
    let insertedCount = 0;
    if (validRowsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('pending_imports')
        .insert(validRowsToInsert);

      if (insertError) {
        throw new Error(`Failed to insert pending imports: ${insertError.message}`);
      }

      insertedCount = validRowsToInsert.length;
    }

    const responsePayload: BulkImportResponse = {
      ok: true,
      batchId,
      totalRows: rawRows.length,
      validCount: validRowsToInsert.length,
      invalidCount: validationErrors.length,
      insertedCount,
      errors: validationErrors,
    };

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
