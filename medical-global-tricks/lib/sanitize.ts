import 'server-only';
import sanitizeHtml from 'sanitize-html';

/** Whitelist for reference-answer HTML coming from the question bank or the admin editor. */
export function cleanHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ['b', 'strong', 'i', 'em', 'br', 'p', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'sup', 'sub'],
    allowedAttributes: {},
  });
}

export const stripHtml = (html: string) => sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} });
