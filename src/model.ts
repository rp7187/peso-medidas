/** As duas medidas acompanhadas. */
export type Metric = "weight" | "waist";

/** Uma medição (normalmente semanal). Pelo menos um dos valores vem preenchido. */
export type Measurement = {
  id: string;
  date: string; // "AAAA-MM-DD" (dia local)
  weight?: number; // kg
  waist?: number; // cm
};

/** Meta de uma medida: sai de `startValue` (em `startDate`) e quer chegar em `target`. */
export type Goal = { target: number; startValue: number; startDate: string; deadline?: string };
export type Goals = Partial<Record<Metric, Goal>>;

export const METRICS: Metric[] = ["weight", "waist"];
export const INFO: Record<Metric, { name: string; short: string; unit: string; min: number; max: number }> = {
  weight: { name: "Peso", short: "Peso", unit: "kg", min: 20, max: 400 },
  waist: { name: "Circunferência abdominal", short: "Cintura", unit: "cm", min: 40, max: 250 },
};

export const uid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** "82,5" ou "82.5" → 82.5 */
export function parseNum(s: string): number | null {
  const t = s.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** 82.5 → "82,5" (1 casa) */
export const num = (n: number, digits = 1) => n.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
export const withUnit = (m: Metric, n: number) => `${num(n)} ${INFO[m].unit}`;
/** Diferença com sinal: "−0,8 kg", "+1,2 cm", "0,0 kg" */
export const delta = (m: Metric, d: number) => `${d > 0.049 ? "+" : d < -0.049 ? "−" : ""}${num(Math.abs(d))} ${INFO[m].unit}`;

export function isMeasurement(x: unknown): x is Measurement {
  if (!x || typeof x !== "object") return false;
  const e = x as Record<string, unknown>;
  const okNum = (v: unknown) => v === undefined || (typeof v === "number" && Number.isFinite(v));
  return typeof e.id === "string" && typeof e.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
    okNum(e.weight) && okNum(e.waist) && (e.weight !== undefined || e.waist !== undefined);
}

/** Um exercício feito num dia (pode haver vários no mesmo dia). */
export type Workout = {
  id: string;
  date: string; // "AAAA-MM-DD" (dia local)
  exercise: string; // "Caminhada", "Musculação"...
  calories: number; // kcal gastas
  minutes?: number; // duração (opcional)
  distance?: number; // km percorridos (opcional; nem todo exercício tem)
};

/** Sugestões para o 1º registro; depois aparecem primeiro os exercícios já usados. */
export const EXERCISES = ["Caminhada", "Corrida", "Bicicleta", "Musculação", "Natação", "Funcional", "Elíptico", "Pilates"];

/** 5.25 → "5,25 km"; 10 → "10 km" */
export const km = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} km`;

/** 1250 → "1.250" */
export const int = (n: number) => Math.round(n).toLocaleString("pt-BR");

export function isWorkout(x: unknown): x is Workout {
  if (!x || typeof x !== "object") return false;
  const e = x as Record<string, unknown>;
  return typeof e.id === "string" && typeof e.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
    typeof e.exercise === "string" && e.exercise.trim() !== "" &&
    typeof e.calories === "number" && Number.isFinite(e.calories) &&
    (e.minutes === undefined || (typeof e.minutes === "number" && Number.isFinite(e.minutes))) &&
    (e.distance === undefined || (typeof e.distance === "number" && Number.isFinite(e.distance)));
}
