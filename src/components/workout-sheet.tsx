import { useState } from "preact/hooks";
import type { Store } from "../app";
import { fmtDate, todayISO } from "../dates";
import { EXERCISES, int, km, parseNum, uid, type Workout } from "../model";
import { exerciseOptions } from "../stats";
import { Sheet } from "./sheet";

/** Registrar / corrigir um exercício. `workout` null = novo. */
export function WorkoutSheet({ store, workout, onClose }: { store: Store; workout: Workout | null; onClose: () => void }) {
  const [date, setDate] = useState(workout?.date ?? todayISO());
  const [exercise, setExercise] = useState(workout?.exercise ?? "");
  const [calories, setCalories] = useState(workout ? String(workout.calories) : "");
  const [minutes, setMinutes] = useState(workout?.minutes != null ? String(workout.minutes) : "");
  const [distance, setDistance] = useState(workout?.distance != null ? km(workout.distance).replace(" km", "") : "");
  const [error, setError] = useState<string | null>(null);
  const options = exerciseOptions(store.workouts, EXERCISES).slice(0, 10);
  const key = exercise.trim().toLocaleLowerCase("pt-BR");
  // Último registro do mesmo exercício (vira dica nos campos).
  const lastSame = key ? [...store.workouts].reverse().find((w) => w.id !== workout?.id && w.exercise.trim().toLocaleLowerCase("pt-BR") === key) : undefined;

  async function submit(e: Event) {
    e.preventDefault();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError("Informe a data.");
    if (date > todayISO()) return setError("A data não pode ser no futuro.");
    const name = exercise.trim().replace(/\s+/g, " ");
    if (!name) return setError("Escolha ou digite o exercício.");
    if (name.length > 40) return setError("Nome do exercício muito longo (máx. 40 letras).");
    const kcal = parseNum(calories);
    if (kcal === null || kcal < 1 || kcal > 5000) return setError("Calorias: informe um valor entre 1 e 5000 kcal.");
    let min: number | undefined;
    if (minutes.trim()) {
      const n = parseNum(minutes);
      if (n === null || n < 1 || n > 600) return setError("Duração: informe entre 1 e 600 minutos (ou deixe em branco).");
      min = Math.round(n);
    }
    let dist: number | undefined;
    if (distance.trim()) {
      const n = parseNum(distance);
      if (n === null || n <= 0 || n > 1000) return setError("Distância: informe entre 0,01 e 1000 km (ou deixe em branco).");
      dist = Math.round(n * 100) / 100;
    }
    await store.saveWorkout({ id: workout?.id ?? uid(), date, exercise: name, calories: Math.round(kcal), ...(min ? { minutes: min } : {}), ...(dist ? { distance: dist } : {}) });
    onClose();
  }

  return (
    <Sheet title={workout ? "Editar exercício" : "Novo exercício"} onClose={onClose} onSubmit={submit}
      actions={<>
        {workout && (
          <button type="button" class="btn ghost danger" onClick={async () => {
            if (confirm(`Apagar ${workout.exercise} de ${fmtDate(workout.date)}?`)) { await store.removeWorkout(workout.id); onClose(); }
          }}>Apagar</button>
        )}
        <button type="button" class="btn ghost" onClick={onClose}>Cancelar</button>
        <button type="submit" class="btn primary">Salvar</button>
      </>}>
      <label>Data<input type="date" value={date} max={todayISO()} onInput={(e) => setDate(e.currentTarget.value)} required /></label>
      <label>Exercício
        <input type="text" autoComplete="off" autoCapitalize="sentences" maxLength={40} value={exercise} placeholder="ex.: Caminhada"
          onInput={(e) => { setExercise(e.currentTarget.value); setError(null); }} />
      </label>
      <div class="chips" role="group" aria-label="Exercícios">
        {options.map((o) => (
          <button key={o} type="button" class={`chip ${o.toLocaleLowerCase("pt-BR") === key ? "on" : ""}`} aria-pressed={o.toLocaleLowerCase("pt-BR") === key}
            onClick={() => { setExercise(o); setError(null); }}>{o}</button>
        ))}
      </div>
      <div class="two">
        <label>Calorias (kcal)
          <input type="text" inputMode="numeric" autoComplete="off" value={calories} placeholder={lastSame ? `último ${int(lastSame.calories)}` : "kcal"}
            onInput={(e) => { setCalories(e.currentTarget.value); setError(null); }} />
        </label>
        <label>Duração (min)
          <input type="text" inputMode="numeric" autoComplete="off" value={minutes} placeholder={lastSame?.minutes ? `último ${lastSame.minutes}` : "opcional"}
            onInput={(e) => { setMinutes(e.currentTarget.value); setError(null); }} />
        </label>
      </div>
      <div class="two">
        <label>Distância (km)
          <input type="text" inputMode="decimal" autoComplete="off" value={distance} placeholder={lastSame?.distance ? `último ${km(lastSame.distance).replace(" km", "")}` : "opcional"}
            onInput={(e) => { setDistance(e.currentTarget.value); setError(null); }} />
        </label>
      </div>
      <p class="muted small">Duração e distância são opcionais. Calorias: use o valor do relógio, da esteira ou do app de treino.</p>
      {error && <p class="error" role="alert">{error}</p>}
    </Sheet>
  );
}
