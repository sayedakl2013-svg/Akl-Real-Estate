import { LogoMark } from './Logo';

export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="container section" style={{ maxWidth: 520 }}>
      <div className="card stack enter" style={{ padding: 28 }}>
        <div className="row" style={{ background: 'var(--navy-950)', borderRadius: 14, padding: '14px 16px', color: '#fff' }}>
          <LogoMark /> <b className="ltr">Medical Global Tricks</b>
        </div>
        <h1 style={{ fontSize: '1.7rem', margin: '8px 0 0' }}>{title}</h1>
        {children}
      </div>
    </div>
  );
}
