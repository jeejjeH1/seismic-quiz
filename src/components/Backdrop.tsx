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
      className={`absolute flex items-center gap-3 rounded-2xl border border-line/15 bg-surface/70 px-4 py-4 shadow-lg shadow-black/20 ${className ?? ""}`}
      style={style}
    >
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/25 text-sm font-extrabold text-primary-light">
        {letter}
      </span>
      <span className="flex flex-col gap-1.5">
        <span className="double-line block h-2 w-24 rounded bg-line/25" />
        <span className="double-line block h-2 w-16 rounded bg-line/15" />
      </span>
    </div>
  );
}

function PodiumMini() {
  return (
    <div className="absolute bottom-[14%] right-[10%] hidden flex-row items-end gap-2 opacity-[0.14] xl:flex">
      {[
        { h: "h-16", label: "2" },
        { h: "h-24", label: "1" },
        { h: "h-12", label: "3" },
      ].map((c, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <span className="text-xs font-bold text-primary-light">{c.label}</span>
          <div className={`w-10 rounded-t-lg bg-gradient-to-t from-primary/60 to-primary-light/70 ${c.h}`} />
        </div>
      ))}
    </div>
  );
}

function BarChartMini() {
  return (
    <div className="absolute left-[4%] bottom-[24%] hidden flex-row items-end gap-2.5 opacity-[0.12] lg:flex">
      {[46, 74, 30, 58].map((h, i) => (
        <div
          key={i}
          className="w-6 rounded-t-md bg-gradient-to-t from-primary/40 to-primary-light/50"
          style={{ height: `${h}px` }}
        />
      ))}
    </div>
  );
}

export default function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="bg-grid absolute inset-0" />

      {/* brand glows */}
      <div className="absolute -top-44 right-[-8%] h-[520px] w-[520px] rounded-full bg-primary/25 blur-[150px]" />
      <div className="absolute bottom-[-18%] left-[-10%] h-[560px] w-[560px] rounded-full bg-primary-light/15 blur-[170px]" />
      <div className="absolute left-[30%] top-[35%] h-[300px] w-[300px] rounded-full bg-primary/10 blur-[120px]" />

      {/* giant "?" — quiz core symbol */}
      <span className="absolute -right-6 top-[4%] select-none font-sans text-[280px] font-extrabold leading-none text-primary/12">
        ?
      </span>
      <span className="absolute left-[2%] top-[46%] rotate-[-14deg] select-none font-sans text-[190px] font-extrabold leading-none text-primary-light/[0.07]">
        ?
      </span>

      {/* countdown ring */}
      <svg
        className="floaty absolute left-[6%] top-[8%] h-44 w-44 opacity-[0.09]"
        viewBox="0 0 100 100"
        style={{ ["--r" as string]: "-6deg" }}
      >
        <circle cx="50" cy="50" r="42" fill="none" stroke="#9C7589" strokeWidth="7" strokeDasharray="200 64" strokeLinecap="round" />
        <circle cx="50" cy="50" r="30" fill="none" stroke="#A4A3A1" strokeWidth="2" strokeDasharray="4 10" />
      </svg>

      {/* floating answer tiles */}
      <OptionTile
        letter="A"
        className="floaty hidden lg:flex"
        style={{ top: "20%", left: "13%", "--r": "-5deg", animationDelay: "0s" } as React.CSSProperties}
      />
      <OptionTile
        letter="B"
        className="floaty hidden xl:flex"
        style={{ top: "62%", right: "7%", "--r": "4deg", animationDelay: "1.6s" } as React.CSSProperties}
      />
      <OptionTile
        letter="C"
        className="floaty hidden xl:flex"
        style={{ top: "36%", right: "17%", "--r": "-3deg", animationDelay: "3.1s" } as React.CSSProperties}
      />
      <OptionTile
        letter="D"
        className="floaty hidden lg:flex"
        style={{ bottom: "9%", left: "22%", "--r": "6deg", animationDelay: "2.2s" } as React.CSSProperties}
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
