import type { Store } from "../app";
import { fmtDate, fmtMonth, relDays } from "../dates";
import { INFO, METRICS, delta, num, withUnit, type Metric } from "../model";
import { summarize, type GoalProgress } from "../stats";
import { ThisWeek } from "./workouts";

export function Summary({ store }: { store: Store }) {
  const empty = store.measurements.length === 0;
  return (
    <>
      <header class="page-head">
        <h1>Minhas medidas</h1>
      </header>
      <button type="button" class="btn primary big wide" onClick={() => store.editMeasurement(null)}>+ Nova medição</button>
      {empty && <p class="muted empty">Registre a primeira medição (peso, cintura ou os dois). O ideal é medir sempre no mesmo dia da semana e no mesmo horário.</p>}
      {METRICS.map((m) => <MetricCard key={m} store={store} metric={m} />)}
      {store.workouts.length > 0
        ? <div class="tap" role="button" tabIndex={0} onClick={() => store.goTo("workouts")} onKeyDown={(e) => { if (e.key === "Enter") store.goTo("workouts"); }}><ThisWeek ws={store.workouts} compact /></div>
        : <button type="button" class="btn ghost wide" onClick={() => store.editWorkout(null)}>+ Registrar exercício</button>}
    </>
  );
}

function MetricCard({ store, metric }: { store: Store; metric: Metric }) {
  const info = INFO[metric];
  const s = summarize(store.measurements, metric, store.goals[metric]);
  if (!s.current) {
    return (
      <section class={`card metric ${metric}`}>
        <div class="card-head"><span class={`dot ${metric}`} />{info.name}</div>
        <p class="muted">Sem medições ainda.</p>
      </section>
    );
  }
  return (
    <section class={`card metric ${metric}`}>
      <div class="card-head"><span class={`dot ${metric}`} />{info.name}</div>
      <div class="current">
        <b>{num(s.current.value)}</b><span>{info.unit}</span>
      </div>
      <p class="muted small">medido {relDays(s.current.date)} ({fmtDate(s.current.date)})</p>
      <div class="facts-grid">
        <Fact label="Última variação" value={s.lastChange == null ? "—" : delta(metric, s.lastChange)}
          hint={s.lastChangeDays != null ? `em ${s.lastChangeDays} dia${s.lastChangeDays === 1 ? "" : "s"}` : "1ª medição"} />
        <Fact label="Total" value={s.totalChange == null ? "—" : delta(metric, s.totalChange)} hint={s.first && s.pts.length > 1 ? `desde ${fmtDate(s.first.date)}` : undefined} />
        <Fact label="Ritmo" value={s.rate == null ? "—" : delta(metric, s.rate)} hint={s.rate == null ? undefined : "por semana"} />
      </div>
      {s.goal ? <GoalBlock metric={metric} g={s.goal} onEdit={() => store.editGoal(metric)} />
        : <button type="button" class="btn ghost small wide" onClick={() => store.editGoal(metric)}>Definir meta</button>}
    </section>
  );
}

function Fact({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div class="fact">
      <span class="muted">{label}</span>
      <b>{value}</b>
      {hint && <small class="muted">{hint}</small>}
    </div>
  );
}

function GoalBlock({ metric, g, onEdit }: { metric: Metric; g: GoalProgress; onEdit: () => void }) {
  const pct = Math.max(0, Math.min(1, g.progress));
  return (
    <div class="goal">
      <div class="goal-head">
        <span>Meta <b>{withUnit(metric, g.goal.target)}</b>{g.goal.deadline && <span class="muted"> até {fmtDate(g.goal.deadline)}</span>}</span>
        <button type="button" class="link" onClick={onEdit}>editar</button>
      </div>
      <div class="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct * 100)}
        aria-label={`Progresso da meta de ${INFO[metric].short.toLowerCase()}`}>
        <div class={`fill ${metric}`} style={{ width: `${pct * 100}%` }} />
      </div>
      <div class="goal-foot">
        <span><b>{Math.round(g.progress * 100)}%</b> <span class="muted">do caminho (início {num(g.goal.startValue)})</span></span>
        {g.reached
          ? <span class="ok">✓ Meta atingida</span>
          : <span>faltam <b>{withUnit(metric, Math.abs(g.remaining))}</b></span>}
      </div>
      {!g.reached && (
        <p class="muted small goal-note">
          {g.eta ? `No ritmo atual, chega lá por volta de ${fmtMonth(g.eta)}.` : "No ritmo atual, ainda não está indo em direção à meta."}
          {g.neededRate != null && ` Para o prazo: ${delta(metric, g.neededRate)} por semana.`}
        </p>
      )}
    </div>
  );
}
