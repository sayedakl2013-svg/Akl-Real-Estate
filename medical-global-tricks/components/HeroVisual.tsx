// Decorative hero illustration: orbiting rings around the brand cross and a heartbeat line.
export function HeroVisual() {
  return (
    <div className="hero-visual" aria-hidden="true">
      <svg viewBox="0 0 400 400">
        <defs>
          <radialGradient id="hv-core" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#2DD4BF" stopOpacity="0.35" />
            <stop offset="1" stopColor="#2DD4BF" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="hv-line" x1="0" x2="1">
            <stop offset="0" stopColor="#5EEAD4" />
            <stop offset="1" stopColor="#9D91F6" />
          </linearGradient>
        </defs>
        <circle cx="200" cy="200" r="190" fill="url(#hv-core)" />
        <g className="spin-slow">
          <circle cx="200" cy="200" r="168" fill="none" stroke="#5EEAD4" strokeOpacity="0.28" strokeDasharray="2 10" strokeWidth="2" />
          <circle cx="200" cy="32" r="6" fill="#C9A24A" />
        </g>
        <g className="spin-rev">
          <circle cx="200" cy="200" r="136" fill="none" stroke="#9D91F6" strokeOpacity="0.35" strokeWidth="1.5" />
          <circle cx="336" cy="200" r="5" fill="#9D91F6" />
          <circle cx="64" cy="200" r="4" fill="#5EEAD4" />
        </g>
        <path d="M168 92h64a8 8 0 0 1 8 8v60h60a8 8 0 0 1 8 8v64a8 8 0 0 1-8 8h-60v60a8 8 0 0 1-8 8h-64a8 8 0 0 1-8-8v-60h-60a8 8 0 0 1-8-8v-64a8 8 0 0 1 8-8h60v-60a8 8 0 0 1 8-8z"
          fill="rgba(10,26,48,0.6)" stroke="#2DD4BF" strokeWidth="4" strokeLinejoin="round" />
        <circle cx="200" cy="200" r="46" fill="none" stroke="#5EEAD4" strokeWidth="3" />
        <ellipse cx="200" cy="200" rx="20" ry="46" fill="none" stroke="#5EEAD4" strokeWidth="2.4" />
        <path d="M156 186h88M156 214h88" stroke="#5EEAD4" strokeWidth="2.4" />
        <path className="ecg" d="M24 352h96l12-22 16 34 18-58 16 50 12-12h182" fill="none" stroke="url(#hv-line)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <circle className="pulse-dot" cx="378" cy="352" r="6" fill="#5EEAD4" />
      </svg>
    </div>
  );
}
