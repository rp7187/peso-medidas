import { useState } from "preact/hooks";
import type { Store } from "../app";
import { fmtDate, todayISO } from "../dates";
import { INFO, METRICS, num, parseNum, uid, type Measurement, type Metric } from "../model";
import { Sheet } from "./sheet";

/** Lançar / corrigir uma medição. `measurement` null = nova. */
export function MeasureSheet({ store, measurement, onClose }: { store: Store; measurement: Measurement | null; onClose: () => void }) {
  const last = (m: Metric) => [...store.measurements].reverse().find((x) => typeof x[m] === "number")?.[m];
  const [date, setDate] = useState(measurement?.date ?? todayISO());
  const [values, setValues] = useState<Record<Metric, string>>({
    weight: measurement?.weight != null ? num(measurement.weight) : "",
    waist: measurement?.waist != null ? num(measurement.waist) : "",
  });
  const [error, setError] = useState<string | null>(null);

  async function submit(e: Event) {
    e.preventDefault();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError("Informe a data.");
    if (date > todayISO()) return setError("A data não pode ser no futuro.");
    const parsed: Partial<Record<Metric, number>> = {};
    for (const m of METRICS) {
      if (!values[m].trim()) continue;
      const n = parseNum(values[m]);
      if (n === null || n < INFO[m].min || n > INFO[m].max) return setError(`${INFO[m].short}: informe um valor entre ${INFO[m].min} e ${INFO[m].max} ${INFO[m].unit}.`);
      parsed[m] = Math.round(n * 10) / 10;
    }
    if (parsed.weight === undefined && parsed.waist === undefined) return setError("Informe o peso, a cintura ou os dois.");

    // Uma medição por dia: se já existe outra no mesmo dia, completa/atualiza aquela.
    const sameDay = store.measurements.find((x) => x.date === date && x.id !== measurement?.id);
    if (sameDay && !measurement) {
      if (!confirm(`Já existe uma medição em ${fmtDate(date)}. Atualizar com estes valores?`)) return;
      await store.save({ ...sameDay, ...parsed });
    } else if (sameDay) {
      return setError(`Já existe outra medição em ${fmtDate(date)}: escolha outra data ou edite aquela.`);
    } else {
      await store.save({ id: measurement?.id ?? uid(), date, ...parsed });
    }
    onClose();
  }

  return (
    <Sheet title={measurement ? "Editar medição" : "Nova medição"} onClose={onClose} onSubmit={submit}
      actions={<>
        {measurement && (
          <button type="button" class="btn ghost danger" onClick={async () => {
            if (confirm(`Apagar a medição de ${fmtDate(measurement.date)}?`)) { await store.remove(measurement.id); onClose(); }
          }}>Apagar</button>
        )}
        <button type="button" class="btn ghost" onClick={onClose}>Cancelar</button>
        <button type="submit" class="btn primary">Salvar</button>
      </>}>
      <label>Data<input type="date" value={date} max={todayISO()} onInput={(e) => setDate(e.currentTarget.value)} required /></label>
      <div class="two">
        {METRICS.map((m) => (
          <label key={m}>
            {INFO[m].short} ({INFO[m].unit})
            <input type="text" inputMode="decimal" autoComplete="off" value={values[m]}
              placeholder={last(m) != null ? `último ${num(last(m)!)}` : INFO[m].unit}
              onInput={(e) => { const v = e.currentTarget.value; setValues((cur) => ({ ...cur, [m]: v })); setError(null); }} />
          </label>
        ))}
      </div>
      <p class="muted small">Pode deixar uma das medidas em branco.</p>
      {error && <p class="error" role="alert">{error}</p>}
    </Sheet>
  );
}
