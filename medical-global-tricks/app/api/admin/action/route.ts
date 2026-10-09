import { handler, json, readJson, clientIp, HttpError } from '@/lib/http';
import { requireStaff } from '@/lib/auth';
import { actions } from '@/lib/admin';

export const POST = handler(async (req) => {
  const body = await readJson(req, 256 * 1024);
  const action = actions[String(body.action)];
  if (!action) throw new HttpError(400, 'unknown_action');
  const actor = await requireStaff(action.role);
  const result = await action.run(actor, body, clientIp(req));
  return json({ ok: true, result: result ?? null });
});
