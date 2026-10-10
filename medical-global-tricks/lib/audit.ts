import 'server-only';
import { q } from './db';

export async function audit(actorId: string | null, action: string, entity: string, entityId: string | number | null, data?: unknown, ip?: string) {
  await q(`INSERT INTO audit_log(actor_id, action, entity, entity_id, data, ip) VALUES ($1,$2,$3,$4,$5,$6)`, [
    actorId, action, entity, entityId === null ? null : String(entityId), data ? JSON.stringify(data) : null, ip ?? null,
  ]);
}
