import type { Store } from "../app";
import { fmtDate } from "../dates";
import { METRICS, delta, num, INFO, type Measurement, type Metric } from "../model";

export function History({ store }: { store: Store }) {
  const list = [...store.measurements].reverse();
  // Valor anterior de cada medida (para a variação de cada linha).
  const prevOf = (m: Measurement, metric: Metric) => {
    const i = store.measurements.indexOf(m);
    for (let j = i - 1; j >= 0; j--) {
      const v = store.measurements[j][metric];
      if (typeof v === "number") return v;
    }
    return null;
  };

  return (
    <>
      <header class="page-head">
        <h1>Medições</h1>
        <button type="button" class="btn small ghost" onClick={() => store.editMeasurement(null)}>+ Nova</button>
      </header>
      {!list.length && <p class="muted empty">Nenhuma medição ainda.</p>}
      {list.length > 0 && (
        <ul class="list">
          {list.map((m) => (
            <li key={m.id}>
              <button type="button" class="item" onClick={() => store.editMeasurement(m)}>
                <span class="when">{fmtDate(m.date)}</span>
                {METRICS.map((metric) => {
                  const v = m[metric];
                  const prev = prevOf(m, metric);
                  return (
                    <span key={metric} class="val">
                      {typeof v === "number" ? <span><b>{num(v)}</b> <span class="muted">{INFO[metric].unit}</span></span> : <span class="muted">—</span>}
                      <small class="muted">{typeof v === "number" && prev != null ? delta(metric, v - prev) : " "}</small>
                    </span>
                  );
                })}
              </button>
            </li>
          ))}
        </ul>
      )}
      {list.length > 0 && <p class="muted small">Toque numa linha para corrigir ou apagar. Variação em relação à medição anterior.</p>}
    </>
  );
}
