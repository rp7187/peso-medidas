import { addDaysISO, dayNum, daysBetween, todayISO, weekStart } from "./dates";
import type { Goal, Measurement, Metric, Workout } from "./model";

export type Point = { date: string; value: number; id: string };

/** Medições que têm a medida, em ordem de data. */
export function series(ms: Measurement[], metric: Metric): Point[] {
  return ms
    .filter((m) => typeof m[metric] === "number")
    .map((m) => ({ date: m.date, value: m[metric] as number, id: m.id }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Ritmo semanal (unidade/semana) por regressão linear das medições das últimas 8 semanas
 * (ou das 2 últimas, se houver menos). null se não der para calcular.
 */
export function weeklyRate(pts: Point[]): number | null {
  if (pts.length < 2) return null;
  const last = pts[pts.length - 1].date;
  let win = pts.filter((p) => daysBetween(p.date, last) <= 56);
  if (win.length < 2) win = pts.slice(-2);
  const xs = win.map((p) => dayNum(p.date) / 86_400_000);
  const ys = win.map((p) => p.value);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  const sxx = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  if (sxx === 0) return null;
  const slope = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / sxx; // por dia
  return slope * 7;
}

export type MetricSummary = {
  pts: Point[];
  current: Point | null;
  previous: Point | null;
  first: Point | null;
  lastChange: number | null;
  lastChangeDays: number | null;
  totalChange: number | null;
  rate: number | null; // por semana
  min: Point | null;
  max: Point | null;
  goal?: GoalProgress;
};

export type GoalProgress = {
  goal: Goal;
  /** 0 = no início, 1 = meta atingida (pode passar de 1 ou ficar negativo). */
  progress: number;
  remaining: number; // quanto falta (com sinal: alvo − atual)
  reached: boolean;
  /** Estimativa no ritmo atual; null se o ritmo não aponta para a meta. */
  eta: string | null;
  /** Ritmo semanal necessário para chegar no prazo (se houver prazo no futuro). */
  neededRate: number | null;
};

export function summarize(ms: Measurement[], metric: Metric, goal?: Goal): MetricSummary {
  const pts = series(ms, metric);
  const current = pts[pts.length - 1] ?? null;
  const previous = pts[pts.length - 2] ?? null;
  const first = pts[0] ?? null;
  const rate = weeklyRate(pts);
  const s: MetricSummary = {
    pts, current, previous, first, rate,
    lastChange: current && previous ? current.value - previous.value : null,
    lastChangeDays: current && previous ? daysBetween(previous.date, current.date) : null,
    totalChange: current && first && pts.length > 1 ? current.value - first.value : null,
    min: pts.length ? pts.reduce((a, b) => (b.value < a.value ? b : a)) : null,
    max: pts.length ? pts.reduce((a, b) => (b.value > a.value ? b : a)) : null,
  };
  if (goal && current) s.goal = goalProgress(goal, current.value, rate);
  return s;
}

export function goalProgress(goal: Goal, current: number, rate: number | null): GoalProgress {
  const span = goal.target - goal.startValue;
  const remaining = goal.target - current;
  const reached = span === 0 ? true : span < 0 ? current <= goal.target : current >= goal.target;
  const progress = span === 0 ? 1 : (current - goal.startValue) / span;
  let eta: string | null = null;
  if (!reached && rate !== null && Math.abs(rate) > 0.01 && Math.sign(rate) === Math.sign(remaining)) {
    const weeks = remaining / rate;
    if (weeks < 52 * 5) eta = addDaysISO(todayISO(), Math.ceil(weeks * 7));
  }
  let neededRate: number | null = null;
  if (!reached && goal.deadline) {
    const days = daysBetween(todayISO(), goal.deadline);
    if (days > 0) neededRate = remaining / (days / 7);
  }
  return { goal, progress, remaining, reached, eta, neededRate };
}

/* ---------- Exercícios ---------- */

export type WeekStats = {
  start: string; // segunda-feira
  days: number; // dias diferentes com exercício
  calories: number;
  minutes: number;
  count: number;
  activeDates: Set<string>;
};

export function weekStats(ws: Workout[], start: string): WeekStats {
  const end = addDaysISO(start, 6);
  const inWeek = ws.filter((w) => w.date >= start && w.date <= end);
  const activeDates = new Set(inWeek.map((w) => w.date));
  return {
    start, activeDates, days: activeDates.size, count: inWeek.length,
    calories: inWeek.reduce((a, w) => a + w.calories, 0),
    minutes: inWeek.reduce((a, w) => a + (w.minutes ?? 0), 0),
  };
}

/** As últimas `n` semanas (a atual por último). */
export function lastWeeks(ws: Workout[], n: number): WeekStats[] {
  const cur = weekStart(todayISO());
  return Array.from({ length: n }, (_, i) => weekStats(ws, addDaysISO(cur, -7 * (n - 1 - i))));
}

/** Dias seguidos com exercício terminando hoje (ou ontem, se hoje ainda não treinou). */
export function streak(ws: Workout[]): number {
  const days = new Set(ws.map((w) => w.date));
  let d = todayISO();
  if (!days.has(d)) d = addDaysISO(d, -1);
  let n = 0;
  while (days.has(d)) { n++; d = addDaysISO(d, -1); }
  return n;
}

/** Exercícios já usados (mais recentes primeiro), completados com as sugestões padrão. */
export function exerciseOptions(ws: Workout[], presets: string[]): string[] {
  const seen = new Map<string, string>();
  for (const w of [...ws].sort((a, b) => b.date.localeCompare(a.date))) {
    const k = w.exercise.trim().toLocaleLowerCase("pt-BR");
    if (!seen.has(k)) seen.set(k, w.exercise.trim());
  }
  for (const p of presets) {
    const k = p.toLocaleLowerCase("pt-BR");
    if (!seen.has(k)) seen.set(k, p);
  }
  return [...seen.values()];
}
