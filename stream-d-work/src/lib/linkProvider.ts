// FR-LINK-2 — deliverable-link provider detection.
// Pure module: no DOM, no network. Given a URL, work out which tool it points
// at so the UI can badge it and (for FR-LINK-3) warn about sharing settings.

export type LinkProvider =
  | 'drive'
  | 'docs'
  | 'sheets'
  | 'slides'
  | 'figma'
  | 'canva'
  | 'behance'
  | 'github'
  | 'notion'
  | 'generic';

export interface ProviderInfo {
  provider: LinkProvider;
  label: string;
}

const LABELS: Record<LinkProvider, string> = {
  drive: 'Google Drive file',
  docs: 'Google Doc',
  sheets: 'Google Sheet',
  slides: 'Google Slides',
  figma: 'Figma file',
  canva: 'Canva design',
  behance: 'Behance project',
  github: 'GitHub repo',
  notion: 'Notion page',
  generic: 'Link',
};

/** Providers that commonly ship "restricted" by default — gates the FR-LINK-3 sharing reminder. */
export const RESTRICTED_SHARING_PROVIDERS: LinkProvider[] = ['drive', 'docs', 'sheets', 'slides', 'figma'];

/** Existing tokens.css channel/status vars reused to accent each provider's badge — no new tokens added. */
export const PROVIDER_ACCENT: Record<LinkProvider, string> = {
  drive: 'var(--chan-technical)',
  docs: 'var(--chan-technical)',
  sheets: 'var(--chan-technical)',
  slides: 'var(--chan-technical)',
  figma: 'var(--chan-design)',
  canva: 'var(--chan-events)',
  behance: 'var(--chan-media)',
  github: 'var(--ink)',
  notion: 'var(--chan-core)',
  generic: 'var(--ink-3)',
};

function stripWww(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, '');
}

/** True if `host` is exactly `domain` or a subdomain of it (e.g. inovx.notion.site vs notion.site). */
function matchesDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

export function detectProvider(url: string): ProviderInfo {
  let host: string;
  let path: string;
  try {
    const parsed = new URL(url);
    host = stripWww(parsed.hostname);
    path = parsed.pathname.toLowerCase();
  } catch {
    return { provider: 'generic', label: LABELS.generic };
  }

  if (host === 'docs.google.com') {
    if (path.startsWith('/spreadsheets')) return { provider: 'sheets', label: LABELS.sheets };
    if (path.startsWith('/presentation')) return { provider: 'slides', label: LABELS.slides };
    return { provider: 'docs', label: LABELS.docs };
  }
  if (host === 'drive.google.com') return { provider: 'drive', label: LABELS.drive };
  if (matchesDomain(host, 'figma.com')) return { provider: 'figma', label: LABELS.figma };
  if (matchesDomain(host, 'canva.com')) return { provider: 'canva', label: LABELS.canva };
  if (matchesDomain(host, 'behance.net')) return { provider: 'behance', label: LABELS.behance };
  if (matchesDomain(host, 'github.com')) return { provider: 'github', label: LABELS.github };
  if (matchesDomain(host, 'notion.so') || matchesDomain(host, 'notion.site')) {
    return { provider: 'notion', label: LABELS.notion };
  }

  return { provider: 'generic', label: LABELS.generic };
}
