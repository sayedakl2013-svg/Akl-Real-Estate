import 'server-only';
import fs from 'node:fs';
import path from 'node:path';

// Local-disk driver. Keys look like "summaries/aesthetic-oral/N.pdf".
const root = () => path.resolve(process.env.STORAGE_DIR ?? './storage');

export function storagePath(key: string): string {
  const p = path.resolve(root(), key);
  if (!p.startsWith(root() + path.sep)) throw new Error('bad storage key');
  return p;
}

export async function saveFile(key: string, data: Buffer) {
  const p = storagePath(key);
  await fs.promises.mkdir(path.dirname(p), { recursive: true });
  await fs.promises.writeFile(p, data);
}

export const fileExists = (key: string) => fs.existsSync(storagePath(key));
export const fileStat = (key: string) => fs.promises.stat(storagePath(key));
export const readStream = (key: string, opts?: { start?: number; end?: number }) => fs.createReadStream(storagePath(key), opts);
export const removeFile = (key: string) => fs.promises.rm(storagePath(key), { force: true });
