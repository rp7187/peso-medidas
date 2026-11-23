import type { Goals, Measurement, Workout } from "./model";

/**
 * Armazenamento 100% local (IndexedDB do Safari).
 * - "measurements": uma linha por medição (keyPath id)
 * - "meta": configurações em chave/valor (hoje só "goals")
 * - "workouts": um registro por exercício feito (keyPath id) — criado na versão 2
 */
// ATENÇÃO: os dados do celular dependem destes nomes. Não renomear; mudanças de estrutura só com
// nova versão + migração em onupgradeneeded, sem apagar registros (ver CLAUDE.md).
const DB_NAME = "peso-medidas";
const MEASUREMENTS = "measurements";
const META = "meta";
const WORKOUTS = "workouts";

let dbp: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  dbp ??= new Promise((resolve, reject) => {
    // v1: measurements + meta. v2: + workouts. A migração só cria o que falta; nunca apaga nada.
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(MEASUREMENTS)) db.createObjectStore(MEASUREMENTS, { keyPath: "id" });
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
      if (!db.objectStoreNames.contains(WORKOUTS)) db.createObjectStore(WORKOUTS, { keyPath: "id" });
    };
    req.onsuccess = () => {
      const db = req.result;
      // Se uma versão futura precisar atualizar o banco, esta conexão sai da frente.
      db.onversionchange = () => { db.close(); dbp = null; };
      resolve(db);
    };
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

async function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(req ? req.result : (undefined as T));
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export const getAll = () => run<Measurement[]>(MEASUREMENTS, "readonly", (s) => s.getAll() as IDBRequest<Measurement[]>);
export const put = (m: Measurement) => run(MEASUREMENTS, "readwrite", (s) => { s.put(m); });
export const remove = (id: string) => run(MEASUREMENTS, "readwrite", (s) => { s.delete(id); });
export const putMany = (ms: Measurement[]) => run(MEASUREMENTS, "readwrite", (s) => { for (const m of ms) s.put(m); });
export const clearMeasurements = () => run(MEASUREMENTS, "readwrite", (s) => { s.clear(); });

export const getWorkouts = () => run<Workout[]>(WORKOUTS, "readonly", (s) => s.getAll() as IDBRequest<Workout[]>);
export const putWorkout = (w: Workout) => run(WORKOUTS, "readwrite", (s) => { s.put(w); });
export const removeWorkout = (id: string) => run(WORKOUTS, "readwrite", (s) => { s.delete(id); });
export const putWorkouts = (ws: Workout[]) => run(WORKOUTS, "readwrite", (s) => { for (const w of ws) s.put(w); });
export const clearWorkouts = () => run(WORKOUTS, "readwrite", (s) => { s.clear(); });

export const getGoals = async (): Promise<Goals> => (await run<Goals | undefined>(META, "readonly", (s) => s.get("goals") as IDBRequest<Goals | undefined>)) ?? {};
export const putGoals = (g: Goals) => run(META, "readwrite", (s) => { s.put(g, "goals"); });

export async function requestPersist(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    return (await navigator.storage.persisted()) || (await navigator.storage.persist());
  } catch {
    return false;
  }
}
