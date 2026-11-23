import { useCallback, useEffect, useState } from "preact/hooks";
import * as db from "./db";
import type { Goals, Measurement, Metric, Workout } from "./model";
import { Summary } from "./components/summary";
import { Evolution } from "./components/evolution";
import { History } from "./components/history";
import { Settings } from "./components/settings";
import { MeasureSheet } from "./components/measure-sheet";
import { GoalSheet } from "./components/goal-sheet";
import { Workouts } from "./components/workouts";
import { WorkoutSheet } from "./components/workout-sheet";

export type Store = {
  measurements: Measurement[];
  goals: Goals;
  save: (m: Measurement) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** Importação de backup: mescla por id; metas do arquivo substituem as atuais se vierem. */
  merge: (ms: Measurement[], goals?: Goals, ws?: Workout[]) => Promise<void>;
  clear: () => Promise<void>;
  setGoals: (g: Goals) => Promise<void>;
  editMeasurement: (m: Measurement | null) => void; // null = nova
  editGoal: (metric: Metric) => void;
  workouts: Workout[];
  saveWorkout: (w: Workout) => Promise<void>;
  removeWorkout: (id: string) => Promise<void>;
  editWorkout: (w: Workout | null) => void; // null = novo
  goTo: (tab: Tab) => void;
};

export type Tab = "summary" | "evolution" | "history" | "workouts" | "settings";
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "summary", label: "Resumo", icon: "M3 12h4l3-8 4 16 3-8h4" },
  { id: "evolution", label: "Evolução", icon: "M3 3v18h18M7 15l4-4 3 3 5-6" },
  { id: "history", label: "Medições", icon: "M4 6h16M4 12h16M4 18h10" },
  { id: "workouts", label: "Exercícios", icon: "M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12" },
  { id: "settings", label: "Ajustes", icon: "M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6" },
];

const byDate = (a: { date: string; id: string }, b: { date: string; id: string }) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id);

export function App() {
  const [measurements, setMeasurements] = useState<Measurement[] | null>(null);
  const [goals, setGoalsState] = useState<Goals>({});
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("summary");
  const [editing, setEditing] = useState<Measurement | null | undefined>(undefined); // undefined = fechado
  const [goalFor, setGoalFor] = useState<Metric | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null | undefined>(undefined);

  useEffect(() => {
    Promise.all([db.getAll(), db.getGoals(), db.getWorkouts()])
      .then(([ms, g, ws]) => { setWorkouts(ws.sort(byDate)); setGoalsState(g); setMeasurements(ms.sort(byDate)); })
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
    merge: (ms, g, ws) => guard(async () => {
      await db.putMany(ms);
      if (g) { await db.putGoals(g); setGoalsState(g); }
      if (ws?.length) {
        await db.putWorkouts(ws);
        setWorkouts((cur) => {
          const map = new Map(cur.map((x) => [x.id, x]));
          for (const w of ws) map.set(w.id, w);
          return [...map.values()].sort(byDate);
        });
      }
      setMeasurements((cur) => {
        const map = new Map((cur ?? []).map((x) => [x.id, x]));
        for (const m of ms) map.set(m.id, m);
        return [...map.values()].sort(byDate);
      });
    }),
    clear: () => guard(async () => {
      await db.clearMeasurements();
      await db.putGoals({});
      await db.clearWorkouts();
      setWorkouts([]);
      setMeasurements([]);
      setGoalsState({});
    }),
    setGoals: (g) => guard(async () => { await db.putGoals(g); setGoalsState(g); }),
    editMeasurement: setEditing,
    editGoal: setGoalFor,
    workouts,
    saveWorkout: (w) => guard(async () => {
      await db.putWorkout(w);
      setWorkouts((cur) => [...cur.filter((x) => x.id !== w.id), w].sort(byDate));
    }),
    removeWorkout: (id) => guard(async () => {
      await db.removeWorkout(id);
      setWorkouts((cur) => cur.filter((x) => x.id !== id));
    }),
    editWorkout: setEditingWorkout,
    goTo: (t) => { setTab(t); window.scrollTo(0, 0); },
  };

  return (
    <>
      <main class="page">
        {tab === "summary" && <Summary store={store} />}
        {tab === "evolution" && <Evolution store={store} />}
        {tab === "history" && <History store={store} />}
        {tab === "workouts" && <Workouts store={store} />}
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
      {editingWorkout !== undefined && <WorkoutSheet store={store} workout={editingWorkout} onClose={() => setEditingWorkout(undefined)} />}
      {goalFor && <GoalSheet store={store} metric={goalFor} onClose={() => setGoalFor(null)} />}
    </>
  );
}
