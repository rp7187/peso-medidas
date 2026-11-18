import { useState } from "preact/hooks";
import type { Store } from "../app";
import { addDaysISO, fmtDate, todayISO } from "../dates";
import { INFO, METRICS, delta, withUnit, type Metric } from "../model";
import { series, summarize } from "../stats";
import { DeltaBars, LineChart } from "./charts";

/** Janela que termina hoje (inclui o dia de N dias atrás). */
const PERIODS = [
  { id: "7d", label: "Semana", days: 7 },
  { id: "14d", label: "14 dias", days: 14 },
  { id: "1m", label: "Mês", days: 31 },
  { id: "3m", label: "3 meses", days: 92 },
  { id: "6m", label: "6 meses", days: 183 },
  { id: "1a", label: "1 ano", days: 366 },
] as const;

export function Evolution({ store }: { store: Store }) {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["id"]>("3m");
  const p = PERIODS.find((x) => x.id === period)!;
  const from = addDaysISO(todayISO(), -p.days);

  return (
    <>
      <header class="page-head">
        <h1>Evolução</h1>
        <div class="seg periods" role="group" aria-label="Período">
          {PERIODS.map((x) => (
            <button key={x.id} type="button" class={period === x.id ? "on" : ""} aria-pressed={period === x.id} onClick={() => setPeriod(x.id)}>{x.label}</button>
          ))}
        </div>
      </header>
      {!store.measurements.length && <p class="muted empty">Os gráficos aparecem depois das primeiras medições.</p>}
      {store.measurements.length > 0 && METRICS.map((m) => <MetricEvolution key={m} store={store} metric={m} from={from} />)}
    </>
  );
}

function MetricEvolution({ store, metric, from }: { store: Store; metric: Metric; from: string }) {
  const info = INFO[metric];
  const all = series(store.measurements, metric);
  const pts = all.filter((x) => x.date >= from);
  if (!pts.length) {
    return <section class="card"><h2>{info.name}</h2><p class="muted small">Sem medições no período.</p></section>;
  }
  // Variação no período: da 1ª à última medição dentro dele. Com uma só medição no período,
  // compara com a última anterior a ele (ex.: "Semana" com uma pesagem = variação desde a semana passada).
  const before = all.filter((x) => x.date < from).pop();
  const base = pts.length >= 2 ? pts[0] : before ?? pts[0];
  const barPts = pts.length >= 2 || !before ? pts : [before, ...pts];
  const last = pts[pts.length - 1];
  const s = summarize(store.measurements, metric, store.goals[metric]);
  const lo = pts.reduce((a, b) => (b.value < a.value ? b : a));
  const hi = pts.reduce((a, b) => (b.value > a.value ? b : a));

  return (
    <section class="card">
      <h2><span class={`dot ${metric}`} />{info.name}</h2>
      <div class="facts-grid">
        <div class="fact"><span class="muted">No período</span><b>{base === last ? "—" : delta(metric, last.value - base.value)}</b><small class="muted">desde {fmtDate(base.date)}</small></div>
        <div class="fact"><span class="muted">Menor</span><b>{withUnit(metric, lo.value)}</b><small class="muted">{fmtDate(lo.date)}</small></div>
        <div class="fact"><span class="muted">Maior</span><b>{withUnit(metric, hi.value)}</b><small class="muted">{fmtDate(hi.date)}</small></div>
      </div>
      <LineChart key={`l${from}`} metric={metric} pts={pts} target={store.goals[metric]?.target} />
      <h3>Variação entre medições</h3>
      <DeltaBars key={`d${from}`} metric={metric} pts={barPts} />
      {s.rate != null && <p class="muted small">Ritmo nas últimas 8 semanas: {delta(metric, s.rate)} por semana.</p>}
    </section>
  );
}
