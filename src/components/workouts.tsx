import { useState } from "preact/hooks";
import type { Store } from "../app";
import { addDaysISO, fmtDate, fmtShort, fmtWeekday, relDays, todayISO, weekStart } from "../dates";
import { int, type Workout } from "../model";
import { lastWeeks, streak, weekStats, type WeekStats } from "../stats";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function Workouts({ store }: { store: Store }) {
  const ws = store.workouts;
  const [showAll, setShowAll] = useState(false);
  // Histórico agrupado por dia (mais recente primeiro).
  const byDay = new Map<string, Workout[]>();
  for (const w of [...ws].sort((a, b) => b.date.localeCompare(a.date))) byDay.set(w.date, [...(byDay.get(w.date) ?? []), w]);
  const days = [...byDay.entries()];
  const shown = showAll ? days : days.slice(0, 20);

  return (
    <>
      <header class="page-head">
        <h1>Exercícios</h1>
      </header>
      <button type="button" class="btn primary big wide" onClick={() => store.editWorkout(null)}>+ Registrar exercício</button>
      {!ws.length && <p class="muted empty">Registre cada exercício com o tipo e as calorias gastas. Dá para lançar mais de um no mesmo dia.</p>}
      {ws.length > 0 && <ThisWeek ws={ws} />}
      {ws.length > 0 && (
        <section class="card">
          <h2><span class="dot exercise" />Últimas 8 semanas</h2>
          <WeekBars weeks={lastWeeks(ws, 8)} />
        </section>
      )}
      {days.length > 0 && (
        <>
          <h3 class="list-title">Histórico</h3>
          <ul class="list">
            {shown.map(([date, items]) => (
              <li key={date} class="day">
                <div class="day-head">
                  <span><b>{fmtWeekday(date)}, {fmtDate(date)}</b> <span class="muted">· {relDays(date)}</span></span>
                  <span class="muted">{int(items.reduce((a, w) => a + w.calories, 0))} kcal</span>
                </div>
                {items.map((w) => (
                  <button key={w.id} type="button" class="workout" onClick={() => store.editWorkout(w)}>
                    <span>{w.exercise}</span>
                    <span class="muted">{w.minutes ? `${w.minutes} min` : ""}</span>
                    <b>{int(w.calories)} <span class="muted">kcal</span></b>
                  </button>
                ))}
              </li>
            ))}
          </ul>
          {days.length > shown.length && <button type="button" class="btn ghost small wide" onClick={() => setShowAll(true)}>Mostrar todos ({days.length} dias)</button>}
          <p class="muted small">Toque num exercício para corrigir ou apagar.</p>
        </>
      )}
    </>
  );
}

/** Semana atual: dias de seg a dom marcados + totais. Usado também no Resumo. */
export function ThisWeek({ ws, compact }: { ws: Workout[]; compact?: boolean }) {
  const today = todayISO();
  const start = weekStart(today);
  const cur = weekStats(ws, start);
  const prev = weekStats(ws, addDaysISO(start, -7));
  const st = streak(ws);
  return (
    <section class="card">
      <h2><span class="dot exercise" />Esta semana</h2>
      <div class="week" role="list" aria-label="Dias da semana com exercício">
        {Array.from({ length: 7 }, (_, i) => addDaysISO(start, i)).map((d) => {
          const on = cur.activeDates.has(d);
          return (
            <div key={d} role="listitem" class={`wd ${on ? "on" : ""} ${d === today ? "today" : ""} ${d > today ? "future" : ""}`}
              aria-label={`${fmtWeekday(d)} ${fmtShort(d)}: ${on ? "com exercício" : "sem exercício"}`}>
              <span>{fmtWeekday(d).slice(0, 1).toUpperCase()}</span>
              <i>{on ? "✓" : ""}</i>
            </div>
          );
        })}
      </div>
      <div class="facts-grid">
        <div class="fact"><span class="muted">Dias</span><b>{cur.days} de 7</b><small class="muted">sem. ant.: {prev.days}</small></div>
        <div class="fact"><span class="muted">Calorias</span><b>{int(cur.calories)} kcal</b><small class="muted">sem. ant.: {int(prev.calories)}</small></div>
        <div class="fact"><span class="muted">{compact ? "Sequência" : "Tempo"}</span>
          {compact
            ? <><b>{plural(st, "dia", "dias")}</b><small class="muted">{st === 1 ? "seguido" : "seguidos"}</small></>
            : <><b>{cur.minutes ? `${int(cur.minutes)} min` : "—"}</b><small class="muted">{plural(cur.count, "exercício", "exercícios")}</small></>}
        </div>
      </div>
      {!compact && st > 1 && <p class="muted small">Sequência atual: {st} dias seguidos.</p>}
    </section>
  );
}

/** Calorias por semana (barra) com os dias ativos de cada uma. Toque mostra o detalhe. */
function WeekBars({ weeks }: { weeks: WeekStats[] }) {
  const [sel, setSel] = useState<number | null>(null);
  const W = 340, H = 150, top = 16, bottom = 34;
  const max = Math.max(100, ...weeks.map((w) => w.calories));
  const slot = W / weeks.length;
  const bw = Math.min(28, slot - 8);
  const avg = weeks.slice(0, -1).filter((w) => w.days > 0);
  const avgKcal = avg.length ? avg.reduce((a, w) => a + w.calories, 0) / avg.length : null;
  const s = sel !== null ? weeks[sel] : null;
  const detail = s
    ? `Semana de ${fmtShort(s.start)}: ${plural(s.days, "dia", "dias")} · ${int(s.calories)} kcal${s.minutes ? ` · ${int(s.minutes)} min` : ""}`
    : "Toque numa barra para ver a semana.";
  return (
    <figure class="chart">
      <p class="chart-detail" aria-live="polite">{detail}</p>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={weeks.map((w) => `semana de ${fmtShort(w.start)}: ${w.days} dias, ${int(w.calories)} kcal`).join("; ")}>
        <line x1={0} x2={W} y1={H - bottom} y2={H - bottom} class="axis" />
        {weeks.map((w, i) => {
          const h = (w.calories / max) * (H - top - bottom);
          const x = i * slot + (slot - bw) / 2;
          const r = Math.min(4, bw / 2, h);
          const y = H - bottom - h;
          return (
            <g key={w.start} class="hit" onClick={() => setSel(sel === i ? null : i)}>
              <rect x={i * slot} y={0} width={slot} height={H} fill="transparent" />
              {h >= 1 && <path class={`bar exercise ${sel === i ? "sel" : ""}`}
                d={`M${x},${H - bottom}V${y + r}Q${x},${y} ${x + r},${y}H${x + bw - r}Q${x + bw},${y} ${x + bw},${y + r}V${H - bottom}Z`} />}
              {w.calories > 0 && <text x={x + bw / 2} y={y - 4} class="tick" text-anchor="middle">{w.calories >= 1000 ? `${(w.calories / 1000).toFixed(1).replace(".", ",")}k` : w.calories}</text>}
              <text x={x + bw / 2} y={H - bottom + 13} class="tick" text-anchor="middle">{i === weeks.length - 1 ? "atual" : fmtShort(w.start)}</text>
              <text x={x + bw / 2} y={H - bottom + 26} class="tick days" text-anchor="middle">{w.days}d</text>
            </g>
          );
        })}
      </svg>
      <p class="muted small">Barra = calorias da semana (seg a dom); embaixo, dias com exercício.{avgKcal != null && ` Média das semanas ativas anteriores: ${int(avgKcal)} kcal.`}</p>
    </figure>
  );
}
