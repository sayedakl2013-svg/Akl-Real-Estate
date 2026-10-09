// Brand mark: a medical cross enclosing a globe, in turquoise on navy.
export function LogoMark({ className = 'brand-mark' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="mgt-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5EEAD4" />
          <stop offset="1" stopColor="#14B8A6" />
        </linearGradient>
      </defs>
      <path d="M18 4h12a2 2 0 0 1 2 2v10h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H32v10a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2V32H6a2 2 0 0 1-2-2V18a2 2 0 0 1 2-2h10V6a2 2 0 0 1 2-2z"
        fill="none" stroke="url(#mgt-g)" strokeWidth="2.6" strokeLinejoin="round" />
      <circle cx="24" cy="24" r="8.5" fill="none" stroke="#5EEAD4" strokeWidth="1.8" />
      <ellipse cx="24" cy="24" rx="3.6" ry="8.5" fill="none" stroke="#5EEAD4" strokeWidth="1.4" />
      <path d="M15.8 21h16.4M15.8 27h16.4" stroke="#5EEAD4" strokeWidth="1.4" />
    </svg>
  );
}
