// Parses the "Aesthetic Medicine Oral Exam Binder" HTML (const CARDS = [...]) into question rows.
// Content is kept exactly as authored; only the inline "⚠ Verification note" paragraph is moved to its own field.
export function parseBinder(html) {
  const m = html.match(/const CARDS = (\[[\s\S]*?\]);\n/);
  if (!m) throw new Error('CARDS array not found in file');
  const cards = JSON.parse(m[1]);
  return cards.map((c) => {
    let detail = String(c.detail ?? '');
    let note = null;
    const vm = detail.match(/<p[^>]*>\s*⚠\s*Verification note:\s*([\s\S]*?)<\/p>/);
    if (vm) {
      note = vm[1].replace(/<[^>]+>/g, '').trim();
      detail = detail.replace(vm[0], '').trim();
    }
    return {
      ref: `binder-${c.id}`, domain: c.d, prompt: String(c.q).trim(), answer: String(c.answer).trim(),
      detail, source: String(c.src ?? '').trim(), note,
    };
  });
}
