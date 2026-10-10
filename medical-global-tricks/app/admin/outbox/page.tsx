import { adminCtx } from '@/lib/adminPage';
import { q } from '@/lib/db';
import { emailConfigured } from '@/lib/email';

export default async function Outbox() {
  const { L, fmt } = await adminCtx('admin');
  const rows = await q('SELECT * FROM email_outbox ORDER BY created_at DESC LIMIT 100');
  return (
    <>
      <h2>{L('Email outbox', 'صندوق البريد الصادر')}</h2>
      {!emailConfigured() && <div className="alert alert-warn">{L('SMTP is not configured, so these messages were NOT delivered. Confirm students manually from their profile instead of forwarding links.', 'لم يتم إعداد SMTP، لذلك لم تُرسل هذه الرسائل. أكّد حسابات الطلاب يدويًا من ملفاتهم بدلًا من إرسال الروابط.')}</div>}
      <div className="table-wrap"><table className="table">
        <thead><tr><th>{L('Date', 'التاريخ')}</th><th>{L('To', 'إلى')}</th><th>{L('Subject', 'الموضوع')}</th><th>{L('Status', 'الحالة')}</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id}><td>{fmt(r.created_at)}</td><td className="ltr">{r.to_email}</td><td>{r.subject}</td><td>{r.status}{r.error && <div className="faint">{r.error}</div>}</td></tr>)}</tbody>
      </table></div>
    </>
  );
}
