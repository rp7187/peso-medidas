import { useCallback, useEffect, useState } from "preact/hooks";
import * as db from "./db";
import type { Goals, Measurement, Metric } from "./model";
import { Summary } from "./components/summary";
import { Evolution } from "./components/evolution";
import { History } from "./components/history";
import { Settings } from "./components/settings";
import { MeasureSheet } from "./components/measure-sheet";
import { GoalSheet } from "./components/goal-sheet";

export type Store = {
  measurements: Measurement[];
  goals: Goals;
  save: (m: Measurement) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** Importação de backup: mescla por id; metas do arquivo substituem as atuais se vierem. */
  merge: (ms: Measurement[], goals?: Goals) => Promise<void>;
  clear: () => Promise<void>;
  setGoals: (g: Goals) => Promise<void>;
  editMeasurement: (m: Measurement | null) => void; // null = nova
  editGoal: (metric: Metric) => void;
};

type Tab = "summary" | "evolution" | "history" | "settings";
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "summary", label: "Resumo", icon: "M3 12h4l3-8 4 16 3-8h4" },
  { id: "evolution", label: "Evolução", icon: "M3 3v18h18M7 15l4-4 3 3 5-6" },
  { id: "history", label: "Medições", icon: "M4 6h16M4 12h16M4 18h10" },
  { id: "settings", label: "Ajustes", icon: "M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6" },
];

const byDate = (a: Measurement, b: Measurement) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id);

export function App() {
  const [measurements, setMeasurements] = useState<Measurement[] | null>(null);
  const [goals, setGoalsState] = useState<Goals>({});
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("summary");
  const [editing, setEditing] = useState<Measurement | null | undefined>(undefined); // undefined = fechado
  const [goalFor, setGoalFor] = useState<Metric | null>(null);

  useEffect(() => {
    Promise.all([db.getAll(), db.getGoals()])
      .then(([ms, g]) => { setMeasurements(ms.sort(byDate)); setGoalsState(g); })
      .catch((e) => setError(String(e)));
    db.requestPersist();
  }, []);

  const guard = useCallback(async (op: () => Promise<void>) => {
    try { await op(); } catch (e) { setError(`Não foi possível salvar: ${e}`); }
  }, []);

  if (error) return <main class="page"><p class="error">{error}</p></main>;
  if (!measurements) return <main class="page" />;

  const store: Store = {
    measurements,
    goals,
    save: (m) => guard(async () => {
      await db.put(m);
      setMeasurements((cur) => [...(cur ?? []).filter((x) => x.id !== m.id), m].sort(byDate));
    }),
    remove: (id) => guard(async () => {
      await db.remove(id);
      setMeasurements((cur) => (cur ?? []).filter((x) => x.id !== id));
    }),
    merge: (ms, g) => guard(async () => {
      await db.putMany(ms);
      if (g) { await db.putGoals(g); setGoalsState(g); }
      setMeasurements((cur) => {
        const map = new Map((cur ?? []).map((x) => [x.id, x]));
        for (const m of ms) map.set(m.id, m);
        return [...map.values()].sort(byDate);
      });
    }),
    clear: () => guard(async () => {
      await db.clearMeasurements();
      await db.putGoals({});
      setMeasurements([]);
      setGoalsState({});
    }),
    setGoals: (g) => guard(async () => { await db.putGoals(g); setGoalsState(g); }),
    editMeasurement: setEditing,
    editGoal: setGoalFor,
  };

  return (
    <>
      <main class="page">
        {tab === "summary" && <Summary store={store} />}
        {tab === "evolution" && <Evolution store={store} />}
        {tab === "history" && <History store={store} />}
        {tab === "settings" && <Settings store={store} />}
      </main>
      <nav class="tabbar" aria-label="Navegação">
        {TABS.map((t) => (
          <button key={t.id} type="button" class={tab === t.id ? "on" : ""} aria-current={tab === t.id ? "page" : undefined}
            onClick={() => { setTab(t.id); window.scrollTo(0, 0); }}>
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d={t.icon} /></svg>
            {t.label}
          </button>
        ))}
      </nav>
      {editing !== undefined && <MeasureSheet store={store} measurement={editing} onClose={() => setEditing(undefined)} />}
      {goalFor && <GoalSheet store={store} metric={goalFor} onClose={() => setGoalFor(null)} />}
    </>
  );
}
