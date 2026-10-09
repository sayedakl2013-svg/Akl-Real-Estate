import 'server-only';

// Same parser as scripts/binder.mjs (CLI import), for the admin upload screen.
export interface BinderRow { ref: string; domain: string; prompt: string; answer: string; detail: string; source: string; note: string | null }

export function parseBinder(html: string): BinderRow[] {
  const m = html.match(/const CARDS = (\[[\s\S]*?\]);\n/);
  if (!m) throw new Error('CARDS array not found in file');
  const cards = JSON.parse(m[1]) as any[];
  return cards.map((c) => {
    let detail = String(c.detail ?? '');
    let note: string | null = null;
    const vm = detail.match(/<p[^>]*>\s*⚠\s*Verification note:\s*([\s\S]*?)<\/p>/);
    if (vm) {
      note = vm[1].replace(/<[^>]+>/g, '').trim();
      detail = detail.replace(vm[0], '').trim();
    }
    return { ref: `binder-${c.id}`, domain: String(c.d), prompt: String(c.q).trim(), answer: String(c.answer).trim(), detail, source: String(c.src ?? '').trim(), note };
  });
}
