import { useRef } from "react";

type Key = "left" | "right" | "jump" | "run" | "down";

function useHold(onPress: (k: Key, v: boolean) => void, key: Key) {
  const active = useRef(false);
  const set = (v: boolean) => (e: React.PointerEvent) => {
    e.preventDefault();
    if (active.current === v) return;
    active.current = v;
    onPress(key, v);
  };
  return {
    onPointerDown: set(true),
    onPointerUp: set(false),
    onPointerCancel: set(false),
    onPointerLeave: set(false),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    style: { touchAction: "none" as const },
  };
}

function Pad({
  label,
  sub,
  size = 76,
  tone = "slate",
  hold,
}: {
  label: string;
  sub?: string;
  size?: number;
  tone?: "slate" | "red" | "cyan";
  hold: ReturnType<typeof useHold>;
}) {
  const tones = {
    slate: "from-slate-100/25 to-slate-500/20 border-white/40 text-white",
    red: "from-rose-400/80 to-rose-700/70 border-rose-200/70 text-white",
    cyan: "from-cyan-300/80 to-sky-600/70 border-cyan-100/70 text-slate-900",
  };
  return (
    <button
      {...hold}
      className={`flex select-none flex-col items-center justify-center rounded-full border-2 bg-gradient-to-b font-pixel shadow-[0_6px_16px_rgba(0,0,0,0.45)] backdrop-blur-sm transition-transform active:scale-95 ${tones[tone]}`}
      style={{ ...hold.style, width: size, height: size }}
    >
      <span style={{ fontSize: size * 0.26 }}>{label}</span>
      {sub && (
        <span className="mt-1 opacity-70" style={{ fontSize: size * 0.12 }}>
          {sub}
        </span>
      )}
    </button>
  );
}

export function TouchControls({ onPress }: { onPress: (k: Key, v: boolean) => void }) {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="pointer-events-auto flex items-center gap-3">
          <Pad label="◀" size={78} hold={useHold(onPress, "left")} />
          <Pad label="▶" size={78} hold={useHold(onPress, "right")} />
        </div>
        <div className="pointer-events-auto flex items-end gap-3">
          <Pad label="⚡" sub="TURBO" size={64} tone="cyan" hold={useHold(onPress, "run")} />
          <Pad label="A" sub="SAUT" size={92} tone="red" hold={useHold(onPress, "jump")} />
        </div>
      </div>
    </>
  );
}
