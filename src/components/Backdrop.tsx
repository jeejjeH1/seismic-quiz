const SEISMIC_PATH =
  "M0,100 L140,100 L168,86 L190,114 L214,58 L238,142 L262,78 L284,106 L312,94 L342,100 L440,100 L468,66 L492,132 L516,52 L538,148 L562,88 L586,110 L614,100 L730,100 L762,84 L792,116 L822,90 L844,106 L884,100 L1440,100";

function OptionTile({
  letter,
  className,
  style,
}: {
  letter: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`absolute flex items-center gap-2 rounded-xl border border-line/15 bg-surface/70 px-2.5 py-2.5 shadow-lg shadow-black/20 sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-4 ${className ?? ""}`}
      style={style}
    >
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/25 text-xs font-extrabold text-primary-light sm:h-9 sm:w-9 sm:text-sm">
        {letter}
      </span>
      <span className="flex flex-col gap-1 sm:gap-1.5">
        <span className="double-line block h-1.5 w-14 rounded bg-line/25 sm:h-2 sm:w-24" />
        <span className="double-line block h-1.5 w-9 rounded bg-line/15 sm:h-2 sm:w-16" />
      </span>
    </div>
  );
}

function PodiumMini() {
  return (
    <div className="absolute bottom-[13%] right-[4%] flex flex-row items-end gap-1.5 opacity-[0.1] sm:gap-2 sm:opacity-[0.14]">
      {[
        { h: "h-8 sm:h-16", label: "2" },
        { h: "h-12 sm:h-24", label: "1" },
        { h: "h-6 sm:h-12", label: "3" },
      ].map((c, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5 sm:gap-1">
          <span className="text-[9px] font-bold text-primary-light sm:text-xs">{c.label}</span>
          <div className={`w-6 rounded-t-lg bg-gradient-to-t from-primary/60 to-primary-light/70 sm:w-10 ${c.h}`} />
        </div>
      ))}
    </div>
  );
}

function BarChartMini() {
  return (
    <div className="absolute bottom-[26%] left-[4%] flex flex-row items-end gap-2 opacity-[0.1] sm:gap-2.5 sm:opacity-[0.12]">
      {[22, 36, 14, 28].map((h, i) => (
        <div
          key={i}
          className="w-3.5 rounded-t-md bg-gradient-to-t from-primary/40 to-primary-light/50 sm:w-6"
          style={{ height: `${h}px` }}
        />
      ))}
    </div>
  );
}

function Sonar({ style }: { style?: React.CSSProperties }) {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="sonar"
          style={{
            ...style,
            animationDelay: `${i * 1.5}s`,
            width: "clamp(120px, 32vw, 220px)",
            height: "clamp(120px, 32vw, 220px)",
          }}
        />
      ))}
    </>
  );
}

function ScorePops() {
  const pops = [
    { text: "+850", left: "12%", bottom: "24%", delay: "0s" },
    { text: "+1000", left: "62%", bottom: "16%", delay: "2.4s" },
    { text: "+640", left: "34%", bottom: "9%", delay: "4.8s" },
    { text: "+1000", left: "78%", bottom: "32%", delay: "1.2s" },
  ];
  return (
    <>
      {pops.map((p, i) => (
        <span
          key={i}
          className="score-pop text-base sm:text-xl"
          style={{ left: p.left, bottom: p.bottom, animationDelay: p.delay }}
        >
          {p.text}
        </span>
      ))}
    </>
  );
}

function DriftDots() {
  const dots = [
    { top: "22%", size: 5, delay: "0s", dur: "15s" },
    { top: "48%", size: 4, delay: "4s", dur: "19s" },
    { top: "72%", size: 6, delay: "8s", dur: "17s" },
    { top: "34%", size: 3, delay: "11s", dur: "21s" },
  ];
  return (
    <>
      {dots.map((d, i) => (
        <span
          key={i}
          className="drift-dot bg-primary-light/60"
          style={{
            top: d.top,
            width: d.size,
            height: d.size,
            animationDelay: d.delay,
            animationDuration: d.dur,
          }}
        />
      ))}
    </>
  );
}

export default function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="bg-grid absolute inset-0" />

      {/* brand glows — lighter blur on mobile for performance */}
      <div className="absolute -top-32 right-[-14%] h-[300px] w-[300px] rounded-full bg-primary/25 blur-[90px] md:-top-44 md:right-[-8%] md:h-[520px] md:w-[520px] md:blur-[150px]" />
      <div className="absolute bottom-[-16%] left-[-16%] h-[320px] w-[320px] rounded-full bg-primary-light/15 blur-[100px] md:bottom-[-18%] md:left-[-10%] md:h-[560px] md:w-[560px] md:blur-[170px]" />
      <div className="absolute left-[24%] top-[34%] h-[200px] w-[200px] rounded-full bg-primary/10 blur-[80px] md:left-[30%] md:top-[35%] md:h-[300px] md:w-[300px] md:blur-[120px]" />

      {/* giant "?" — quiz core symbol */}
      <span className="absolute -right-4 top-[3%] select-none font-sans text-[150px] font-extrabold leading-none text-primary/12 sm:text-[190px] md:-right-6 md:text-[280px]">
        ?
      </span>
      <span className="absolute left-[-4%] top-[48%] rotate-[-14deg] select-none font-sans text-[110px] font-extrabold leading-none text-primary-light/[0.07] sm:text-[140px] md:left-[2%] md:text-[190px]">
        ?
      </span>

      {/* sonar pulses — seismic radar */}
      <Sonar style={{ left: "6%", top: "56%" }} />

      {/* floating score pops */}
      <ScorePops />

      {/* drifting light dots */}
      <DriftDots />

      {/* sweeping countdown ring */}
      <svg
        className="floaty absolute left-[5%] top-[6%] h-24 w-24 opacity-[0.1] sm:h-36 sm:w-36 md:left-[6%] md:top-[8%] md:h-44 md:w-44"
        viewBox="0 0 100 100"
        style={{ ["--r" as string]: "-6deg" }}
      >
        <circle cx="50" cy="50" r="42" fill="none" stroke="#9C7589" strokeWidth="7" strokeDasharray="200 64" strokeLinecap="round" />
        <circle
          className="sweep-ring"
          cx="50"
          cy="50"
          r="30"
          fill="none"
          stroke="#B08CA0"
          strokeWidth="3"
          strokeDasharray="264"
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
      </svg>

      {/* floating answer tiles — 2 on mobile, 4 on large screens */}
      <OptionTile
        letter="A"
        className="floaty"
        style={{ top: "17%", left: "4%", "--r": "-5deg", animationDelay: "0s" } as React.CSSProperties}
      />
      <OptionTile
        letter="B"
        className="floaty hidden md:flex"
        style={{ top: "62%", right: "7%", "--r": "4deg", animationDelay: "1.6s" } as React.CSSProperties}
      />
      <OptionTile
        letter="C"
        className="floaty hidden md:flex"
        style={{ top: "36%", right: "17%", "--r": "-3deg", animationDelay: "3.1s" } as React.CSSProperties}
      />
      <OptionTile
        letter="D"
        className="floaty"
        style={{ bottom: "22%", right: "4%", "--r": "6deg", animationDelay: "2.2s" } as React.CSSProperties}
      />

      {/* mini leaderboard podium */}
      <PodiumMini />

      {/* mini answer distribution chart */}
      <BarChartMini />

      {/* seismic underline (brand nod) */}
      <svg
        className="wave wave-b absolute left-0 w-[200%]"
        viewBox="0 0 2880 200"
        preserveAspectRatio="none"
        fill="none"
      >
        <defs>
          <path id="sq-wave-bottom" d={SEISMIC_PATH} />
        </defs>
        <use href="#sq-wave-bottom" x={0} stroke="#9C7589" strokeWidth="1.4" />
        <use href="#sq-wave-bottom" x={1440} stroke="#9C7589" strokeWidth="1.4" />
      </svg>

      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-primary/60 to-transparent" />
    </div>
  );
}
