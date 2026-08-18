"use client";

import { ChevronDown, ArrowLeft, Check } from "lucide-react";
import Link from "next/link";

export const FONTS = (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;600&display=swap');
    @keyframes pulseGlow {
      0%, 100% { box-shadow: 0 0 0 0 rgba(232,96,28,0.45); }
      50% { box-shadow: 0 0 0 10px rgba(232,96,28,0); }
    }
    .fonte-titulo { font-family: 'Space Grotesk', sans-serif; }
    .fonte-mono { font-family: 'IBM Plex Mono', monospace; }
  `}</style>
);

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full flex items-start justify-center p-6 bg-[#F4F6FC]" style={{ fontFamily: "'Inter', sans-serif" }}>
      {FONTS}
      <div className="w-full max-w-sm mt-4">{children}</div>
    </div>
  );
}

export function Header({ title, backHref }: { title: string; backHref: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <Link href={backHref} className="text-[#6B7699]">
        <ArrowLeft size={20} />
      </Link>
      <h1 className="fonte-titulo text-lg font-bold flex-1 text-[#0B1440]">{title}</h1>
    </div>
  );
}

export function FixedSelect({
  value,
  onChange,
  options,
  placeholder,
  icon: Icon,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  icon?: any;
  required?: boolean;
}) {
  return (
    <div className="relative">
      {Icon && <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#6B7699]" />}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-md border border-[#DCE1F5] bg-white py-2.5 text-sm outline-none text-[#0B1440]"
        style={{ paddingLeft: Icon ? 36 : 12, paddingRight: 32 }}
      >
        <option value="">{placeholder}{required ? " *" : ""}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#6B7699]" />
    </div>
  );
}

export function TypeableSelect({
  value,
  onChange,
  options,
  placeholder,
  icon: Icon,
  listId,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  icon?: any;
  listId: string;
}) {
  return (
    <div className="relative">
      {Icon && <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#6B7699]" />}
      <input
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-md border border-[#DCE1F5] bg-white py-2.5 text-sm outline-none text-[#0B1440]"
        style={{ paddingLeft: Icon ? 36 : 12, paddingRight: 12 }}
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </div>
  );
}

export function TextField({
  value,
  onChange,
  placeholder,
  mono,
  required,
  inputMode,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  mono?: boolean;
  required?: boolean;
  inputMode?: "numeric" | "text";
}) {
  return (
    <input
      value={value}
      inputMode={inputMode}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder + (required ? " *" : "")}
      className="w-full rounded-md border border-[#DCE1F5] bg-white py-2.5 px-3 text-sm outline-none text-[#0B1440]"
      style={{ fontFamily: mono ? "'IBM Plex Mono', monospace" : "inherit" }}
    />
  );
}

export function TextArea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className="w-full rounded-md border border-[#DCE1F5] bg-white py-2.5 px-3 text-sm outline-none resize-none text-[#0B1440]"
    />
  );
}

export function StepShell({
  number,
  title,
  done,
  open,
  onToggle,
  summary,
  children,
}: {
  number: number;
  title: string;
  done: boolean;
  open: boolean;
  onToggle: () => void;
  summary?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-[#DCE1F5]">
      <button onClick={onToggle} className="w-full flex items-center gap-3 py-4 text-left">
        <span
          className="fonte-mono flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 text-white"
          style={{ background: done ? "#1F8A70" : "#0B1440" }}
        >
          {done ? <Check size={14} /> : number}
        </span>
        <div className="flex-1 min-w-0">
          <div className="fonte-titulo font-semibold text-[15px] text-[#0B1440]">{title}</div>
          {!open && summary && <div className="text-xs mt-0.5 truncate text-[#6B7699]">{summary}</div>}
        </div>
        <ChevronDown size={18} className="text-[#6B7699]" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }} />
      </button>
      <div style={{ maxHeight: open ? 900 : 0, overflow: "hidden", transition: "max-height 0.25s ease" }}>
        <div className="pb-5">{children}</div>
      </div>
    </div>
  );
}
