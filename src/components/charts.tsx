import { useState } from "preact/hooks";
import { dayNum, fmtDate, fmtShort } from "../dates";
import { delta, num, withUnit, type Metric } from "../model";
import type { Point } from "../stats";

/*
 * Gráficos em SVG puro. Uma medida por gráfico (sem eixo duplo); cor pelo papel (--weight / --waist),
 * validada nos temas claro e escuro. Toque num ponto/barra mostra o valor na linha de detalhe.
 */

/** Escala "bonita" para o eixo y: ~4 marcas em passos de 0,5/1/2/5. */
function niceTicks(lo: number, hi: number): number[] {
  const span = Math.max(hi - lo, 1);
  const raw = span / 4;
  const step = [0.5, 1, 2, 5, 10, 20].find((s) => s >= raw) ?? 50;
  const out: number[] = [];
  const end = Math.ceil(hi / step) * step; // a última marca cobre o maior valor
  for (let v = Math.floor(lo / step) * step; v <= end + 1e-9; v += step) out.push(Math.round(v * 10) / 10);
  return out;
}

export function LineChart({ metric, pts, target }: { metric: Metric; pts: Point[]; target?: number }) {
  const [selRaw, setSel] = useState<number | null>(null);
  const sel = selRaw !== null && selRaw < pts.length ? selRaw : null;
  const W = 340, H = 180, left = 34, right = 10, top = 12, bottom = 22;
  const xs = pts.map((p) => dayNum(p.date));
  let x0 = Math.min(...xs), x1 = Math.max(...xs);
  if (x0 === x1) { x0 -= 3 * 86_400_000; x1 += 3 * 86_400_000; }
  const vals = pts.map((p) => p.value).concat(target != null ? [target] : []);
  const pad = Math.max((Math.max(...vals) - Math.min(...vals)) * 0.12, 0.5);
  const ticks = niceTicks(Math.min(...vals) - pad, Math.max(...vals) + pad);
  const y0 = ticks[0], y1 = ticks[ticks.length - 1];
  const X = (t: number) => left + ((t - x0) / (x1 - x0)) * (W - left - right);
  const Y = (v: number) => top + (1 - (v - y0) / (y1 - y0)) * (H - top - bottom);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${X(dayNum(p.date)).toFixed(1)},${Y(p.value).toFixed(1)}`).join("");
  // Área de toque de cada ponto: até o meio do caminho para os vizinhos.
  const cx = pts.map((p) => X(dayNum(p.date)));
  const bounds = cx.map((c, i) => [i ? (cx[i - 1] + c) / 2 : left, i < cx.length - 1 ? (c + cx[i + 1]) / 2 : W - right]);
  const xTicks = pts.length <= 1 ? [0] : [0, Math.floor((pts.length - 1) / 2), pts.length - 1].filter((v, i, a) => a.indexOf(v) === i);

  const detail = sel !== null
    ? `${fmtDate(pts[sel].date)}: ${withUnit(metric, pts[sel].value)}${sel > 0 ? ` (${delta(metric, pts[sel].value - pts[sel - 1].value)})` : ""}`
    : target != null ? `meta ${withUnit(metric, target)}` : " ";

  return (
    <figure class="chart">
      <p class="chart-detail" aria-live="polite">{detail}</p>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={pts.map((p) => `${fmtDate(p.date)}: ${withUnit(metric, p.value)}`).join("; ")}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={left} x2={W - right} y1={Y(t)} y2={Y(t)} class="grid" />
            <text x={left - 6} y={Y(t) + 3.5} class="tick" text-anchor="end">{num(t, t % 1 ? 1 : 0)}</text>
          </g>
        ))}
        {target != null && (
          <g>
            <line x1={left} x2={W - right} y1={Y(target)} y2={Y(target)} class="target" />
            <text x={W - right} y={Y(target) - 5} class="tick target-label" text-anchor="end">meta</text>
          </g>
        )}
        <path d={line} class={`line ${metric}`} />
        {pts.map((p, i) => (
          <g key={p.id} class="hit" onClick={() => setSel(sel === i ? null : i)}>
            <rect x={bounds[i][0]} y={0} width={Math.max(1, bounds[i][1] - bounds[i][0])} height={H} fill="transparent" />
            <circle cx={cx[i]} cy={Y(p.value)} r={sel === i ? 6 : 4} class={`pt ${metric} ${sel === i ? "sel" : ""}`} />
          </g>
        ))}
        {xTicks.map((i) => (
          <text key={`x${i}`} x={cx[i]} y={H - 5} class="tick" text-anchor={i === 0 && pts.length > 1 ? "start" : i === pts.length - 1 && pts.length > 1 ? "end" : "middle"}>{fmtShort(pts[i].date)}</text>
        ))}
      </svg>
    </figure>
  );
}

/** Variação entre cada medição e a anterior (barra para baixo = diminuiu). */
export function DeltaBars({ metric, pts }: { metric: Metric; pts: Point[] }) {
  const [selRaw, setSel] = useState<number | null>(null);
  const ds = pts.slice(1).map((p, i) => ({ p, d: p.value - pts[i].value, prev: pts[i] }));
  if (!ds.length) return <p class="muted small">Precisa de pelo menos duas medições.</p>;
  const sel = selRaw !== null && selRaw < ds.length ? selRaw : null;
  const W = 340, H = 140, top = 10, bottom = 20;
  const m = Math.max(0.5, ...ds.map((x) => Math.abs(x.d)));
  const zero = top + (H - top - bottom) / 2;
  const scale = (H - top - bottom) / 2 / m;
  const slot = W / ds.length;
  const bw = Math.max(3, Math.min(26, slot - 2));
  const detail = sel !== null
    ? `${fmtShort(ds[sel].prev.date)} → ${fmtShort(ds[sel].p.date)}: ${delta(metric, ds[sel].d)}`
    : "Toque numa barra para ver a variação.";
  return (
    <figure class="chart">
      <p class="chart-detail" aria-live="polite">{detail}</p>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ds.map((x) => `${fmtShort(x.p.date)}: ${delta(metric, x.d)}`).join("; ")}>
        <text x={0} y={top + 8} class="tick">+{num(m)}</text>
        <text x={0} y={H - bottom - 2} class="tick">−{num(m)}</text>
        {ds.map((x, i) => {
          const h = Math.abs(x.d) * scale;
          const bx = i * slot + (slot - bw) / 2;
          const r = Math.min(4, bw / 2, h);
          // ponta arredondada no lado oposto ao zero
          const d = h < 0.5 ? "" : x.d > 0
            ? `M${bx},${zero}V${zero - h + r}Q${bx},${zero - h} ${bx + r},${zero - h}H${bx + bw - r}Q${bx + bw},${zero - h} ${bx + bw},${zero - h + r}V${zero}Z`
            : `M${bx},${zero}V${zero + h - r}Q${bx},${zero + h} ${bx + r},${zero + h}H${bx + bw - r}Q${bx + bw},${zero + h} ${bx + bw},${zero + h - r}V${zero}Z`;
          return (
            <g key={x.p.id} class="hit" onClick={() => setSel(sel === i ? null : i)}>
              <rect x={i * slot} y={0} width={slot} height={H} fill="transparent" />
              {d ? <path d={d} class={`bar ${metric} ${sel === i ? "sel" : ""}`} /> : <rect x={bx} y={zero - 1} width={bw} height={2} class={`bar ${metric}`} />}
            </g>
          );
        })}
        <line x1={0} x2={W} y1={zero} y2={zero} class="axis" />
        {[0, ds.length - 1].filter((v, i, a) => a.indexOf(v) === i).map((i) => (
          <text key={i} x={i * slot + slot / 2} y={H - 5} class="tick" text-anchor={ds.length > 1 ? (i === 0 ? "start" : "end") : "middle"}>{fmtShort(ds[i].p.date)}</text>
        ))}
      </svg>
    </figure>
  );
}
