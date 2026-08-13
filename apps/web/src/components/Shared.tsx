import React from "react";

export function Logo({ size = "text-2xl" }: { size?: string }) {
  return (
    <div className={`font-display font-700 ${size} flex items-center gap-1.5 select-none`}>
      <span style={{ color: "var(--plum)" }}>Crust</span>
      <span
        className="inline-flex items-center justify-center rounded-full animate-wiggle"
        style={{ background: "var(--coral)", width: "1.15em", height: "1.15em", fontSize: "0.75em" }}
      >
        🍪
      </span>
      <span style={{ color: "var(--teal)" }}>Issues</span>
    </div>
  );
}

export function Mascot({ className = "", mood = "happy" }: { className?: string; mood?: "happy" | "thinking" | "excited" }) {
  return (
    <svg viewBox="0 0 200 200" className={className} xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="100" cy="185" rx="55" ry="10" fill="#2D1B4E" opacity="0.08" />
      <circle cx="100" cy="100" r="72" fill="url(#cookieGrad)" />
      <defs>
        <radialGradient id="cookieGrad" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#F3BE73" />
          <stop offset="100%" stopColor="#D89238" />
        </radialGradient>
      </defs>
      <circle cx="62" cy="60" r="7" fill="#6B3F1D" opacity="0.55" />
      <circle cx="130" cy="72" r="6" fill="#6B3F1D" opacity="0.5" />
      <circle cx="145" cy="120" r="7.5" fill="#6B3F1D" opacity="0.55" />
      <circle cx="70" cy="140" r="6.5" fill="#6B3F1D" opacity="0.5" />
      <circle cx="110" cy="150" r="5.5" fill="#6B3F1D" opacity="0.45" />
      <circle cx="45" cy="105" r="5" fill="#6B3F1D" opacity="0.45" />
      <circle cx="78" cy="95" r="6" fill="#2D1B4E" />
      <circle cx="122" cy="95" r="6" fill="#2D1B4E" />
      <circle cx="66" cy="120" r="9" fill="#FF6B6B" opacity="0.45" />
      <circle cx="134" cy="120" r="9" fill="#FF6B6B" opacity="0.45" />
      {mood === "excited" ? (
        <path d="M78 118 Q100 145 122 118" stroke="#2D1B4E" strokeWidth="5" fill="none" strokeLinecap="round" />
      ) : mood === "thinking" ? (
        <path d="M82 122 Q100 118 118 122" stroke="#2D1B4E" strokeWidth="5" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M80 116 Q100 134 120 116" stroke="#2D1B4E" strokeWidth="5" fill="none" strokeLinecap="round" />
      )}
    </svg>
  );
}

export function Badge({ children, color = "teal" }: { children: React.ReactNode; color?: "teal" | "coral" | "sun" | "plum" }) {
  const map: Record<string, string> = {
    teal: "bg-[var(--teal)]/15 text-[#00897B]",
    coral: "bg-[var(--coral)]/15 text-[#E1483D]",
    sun: "bg-[var(--sun)]/25 text-[#8A6300]",
    plum: "bg-[var(--plum)]/10 text-[var(--plum)]",
  };
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${map[color]}`}>{children}</span>;
}

export function Spinner({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Confetti({ show }: { show: boolean }) {
  if (!show) return null;
  const colors = ["#FF6B6B", "#FFC93C", "#00C2A8", "#2D1B4E"];
  return (
    <div className="pointer-events-none fixed inset-0 z-[999] overflow-hidden">
      {Array.from({ length: 40 }).map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.4;
        const duration = 2 + Math.random() * 1.5;
        const size = 6 + Math.random() * 6;
        return (
          <span
            key={i}
            className="confetti-piece"
            style={{
              left: `${left}%`,
              width: size,
              height: size * 0.5,
              background: colors[i % colors.length],
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
          />
        );
      })}
    </div>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <Mascot className="w-24 h-24 mb-4 animate-bob" mood="thinking" />
      <p className="font-display font-600 text-lg text-[var(--plum)]">{title}</p>
      {subtitle && <p className="text-sm text-[var(--ink)]/60 mt-1 max-w-xs">{subtitle}</p>}
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  className = "",
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`relative overflow-hidden font-display font-600 rounded-2xl px-5 py-3 transition-all duration-200
      bg-[var(--coral)] text-white shadow-[0_6px_0_0_#c94a41] hover:shadow-[0_3px_0_0_#c94a41] hover:translate-y-[3px]
      active:shadow-none active:translate-y-[6px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-[0_6px_0_0_#c94a41] ${className}`}
    >
      {children}
    </button>
  );
}
