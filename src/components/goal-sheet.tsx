import { useState } from "preact/hooks";
import type { Store } from "../app";
import { fmtDate, todayISO } from "../dates";
import { INFO, num, parseNum, type Metric } from "../model";
import { series } from "../stats";
import { Sheet } from "./sheet";

/** Definir / alterar / remover a meta de uma medida (alvo, prazo opcional e ponto de partida do progresso). */
export function GoalSheet({ store, metric, onClose }: { store: Store; metric: Metric; onClose: () => void }) {
  const info = INFO[metric];
  const goal = store.goals[metric];
  const pts = series(store.measurements, metric);
  const current = pts[pts.length - 1];
  const [target, setTarget] = useState(goal ? num(goal.target) : "");
  const [deadline, setDeadline] = useState(goal?.deadline ?? "");
  const first = pts[0];
  // Ponto de partida: a 1ª medição (progresso acumulado) ou a atual (contar daqui pra frente).
  const [from, setFrom] = useState<"keep" | "first" | "current">(goal ? "keep" : "first");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: Event) {
    e.preventDefault();
    const t = parseNum(target);
    if (t === null || t < info.min || t > info.max) return setError(`Informe a meta entre ${info.min} e ${info.max} ${info.unit}.`);
    if (!current) return setError(`Registre uma medição de ${info.short.toLowerCase()} antes de definir a meta.`);
    if (deadline && deadline <= todayISO()) return setError("O prazo precisa ser uma data futura.");
    const start = from === "keep" && goal ? { startValue: goal.startValue, startDate: goal.startDate }
      : from === "first" ? { startValue: first.value, startDate: first.date }
      : { startValue: current.value, startDate: current.date };
    await store.setGoals({ ...store.goals, [metric]: { target: Math.round(t * 10) / 10, ...start, ...(deadline ? { deadline } : {}) } });
    onClose();
  }

  return (
    <Sheet title={`Meta de ${info.short.toLowerCase()}`} onClose={onClose} onSubmit={submit}
      actions={<>
        {goal && (
          <button type="button" class="btn ghost danger" onClick={async () => {
            if (!confirm("Remover esta meta?")) return;
            const { [metric]: _, ...rest } = store.goals;
            await store.setGoals(rest);
            onClose();
          }}>Remover</button>
        )}
        <button type="button" class="btn ghost" onClick={onClose}>Cancelar</button>
        <button type="submit" class="btn primary">Salvar</button>
      </>}>
      <label>Meta ({info.unit})
        <input type="text" inputMode="decimal" autoComplete="off" value={target} placeholder={current ? `atual ${num(current.value)}` : info.unit}
          onInput={(e) => { setTarget(e.currentTarget.value); setError(null); }} />
      </label>
      <label>Prazo (opcional)<input type="date" value={deadline} min={todayISO()} onInput={(e) => setDeadline(e.currentTarget.value)} /></label>
      {current && (
        <fieldset class="choice">
          <legend>Contar o progresso a partir de</legend>
          {goal && (
            <label class="check"><input type="radio" name="from" checked={from === "keep"} onChange={() => setFrom("keep")} />
              <span>Manter o início atual <span class="muted">({fmtDate(goal.startDate)} · {num(goal.startValue)} {info.unit})</span></span></label>
          )}
          <label class="check"><input type="radio" name="from" checked={from === "first"} onChange={() => setFrom("first")} />
            <span>Primeira medição <span class="muted">({fmtDate(first.date)} · {num(first.value)} {info.unit})</span></span></label>
          {current.id !== first.id && (
            <label class="check"><input type="radio" name="from" checked={from === "current"} onChange={() => setFrom("current")} />
              <span>Medição atual <span class="muted">({fmtDate(current.date)} · {num(current.value)} {info.unit})</span></span></label>
          )}
        </fieldset>
      )}
      {error && <p class="error" role="alert">{error}</p>}
    </Sheet>
  );
}
