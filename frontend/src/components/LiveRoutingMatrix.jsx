/**
 * LiveRoutingMatrix.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders an 8×8 grid showing confirmed / pending / empty routes.
 * Receives inputLabels and outputLabels so custom names appear in headers.
 *
 * Props:
 *   routes       – { [outputNum]: inputNum }  confirmed from device
 *   pendingRoute – { input, output }          optimistic pending
 *   onSyncAll    – callback to trigger GET MP for all outputs
 *   syncBusy     – boolean (disables button while syncing)
 *   inputLabels  – { [1..8]: string }
 *   outputLabels – { [1..8]: string }
 *   isAdmin      – boolean (shows Sync All only for admin)
 */
const INS  = Array.from({ length: 8 }, (_, i) => i + 1);
const OUTS = Array.from({ length: 8 }, (_, i) => i + 1);

function getCellKind(inNum, outNum, routes, pending) {
  if (pending && pending.output === outNum) {
    if (pending.input === inNum) return routes[outNum] === inNum ? "confirmed" : "pending";
    if (routes[outNum] === inNum) return "stale";
    return "empty";
  }
  return routes[outNum] === inNum ? "confirmed" : "empty";
}

function cellClass(kind) {
  if (kind === "confirmed") return "border-emerald-500/80 bg-emerald-500/15 shadow-[0_0_12px_rgba(52,211,153,0.3)] text-emerald-100";
  if (kind === "pending")   return "border-orange-400/90  bg-orange-500/15  shadow-[0_0_12px_rgba(251,146,60,0.3)]  text-orange-100";
  if (kind === "stale")     return "border-amber-700/50   bg-amber-950/40   text-amber-300/50";
  return "border-white/10 bg-black/40 text-slate-700";
}

export default function LiveRoutingMatrix({ routes, pendingRoute, onSyncAll, syncBusy, inputLabels = {}, outputLabels = {}, isAdmin = false }) {
  const inLabel  = (n) => inputLabels[n]  || `IN ${n}`;
  const outLabel = (n) => outputLabels[n] || `OUT ${n}`;

  return (
    <section className="border-glow-cyan rounded-lg border border-cyan-500/30 bg-[#0a0c10]/90 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-normal uppercase tracking-[0.2em] text-glow-cyan text-cyan-400">
          Live Routing Matrix — Device Feedback
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500 shadow-[0_0_6px_#34d399]"/>Confirmed</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-orange-400"/>Pending</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-white/20 bg-black/60"/>No route</span>
          </div>
          {/* Sync All is admin-only — regular users can see matrix but not trigger sync */}
          {isAdmin && (
            <button type="button" onClick={onSyncAll} disabled={syncBusy}
              className="flex items-center gap-2 rounded border border-cyan-500/50 bg-cyan-950/40 px-3 py-1.5 text-xs uppercase tracking-wider text-cyan-400 transition hover:bg-cyan-900/50 disabled:opacity-50">
              <span aria-hidden>⟳</span> Sync All
            </button>
          )}
        </div>
      </div>

      {/* Matrix grid */}
      <div className="overflow-x-auto scroll-dark">
        <table className="w-full min-w-[580px] border-collapse text-center text-xs">
          <thead>
            <tr>
              <th className="p-1 text-slate-600 text-left text-[9px] uppercase tracking-widest">OUT ↓ / IN →</th>
              {INS.map((n) => (
                <th key={n} className="p-1 font-normal text-[10px] uppercase tracking-widest text-cyan-400/80 max-w-[60px]">
                  <span className="block truncate" title={inLabel(n)}>{inLabel(n)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {OUTS.map((outNum) => (
              <tr key={outNum}>
                <th className="py-1 pr-2 text-left text-[10px] font-normal uppercase tracking-widest text-orange-400/80 max-w-[80px]">
                  <span className="block truncate" title={outLabel(outNum)}>{outLabel(outNum)}</span>
                </th>
                {INS.map((inNum) => {
                  const kind  = getCellKind(inNum, outNum, routes, pendingRoute);
                  const label = kind === "empty" ? "—" : String(inNum);
                  return (
                    <td key={`${outNum}-${inNum}`} className="p-0.5">
                      <div className={`flex h-8 w-full items-center justify-center rounded border text-[11px] font-semibold transition-all duration-300 ${cellClass(kind)}`}
                        title={`${inLabel(inNum)} → ${outLabel(outNum)}`}>
                        {label}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Route summary bar */}
      <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
        {OUTS.map((o) => {
          const r = routes[o];
          return (
            <div key={o} className="flex min-w-[80px] flex-1 items-center justify-center gap-1 rounded border border-white/10 bg-black/50 px-2 py-1.5 text-[10px] uppercase tracking-wider">
              <span className="text-orange-400/80 truncate">{outLabel(o)}</span>
              <span className="text-slate-600">:</span>
              <span className="text-cyan-400 truncate">{Number.isInteger(r) ? inLabel(r) : "—"}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
