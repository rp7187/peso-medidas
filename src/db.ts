import type { Goals, Measurement } from "./model";

/**
 * Armazenamento 100% local (IndexedDB do Safari).
 * - "measurements": uma linha por medição (keyPath id)
 * - "meta": configurações em chave/valor (hoje só "goals")
 */
// ATENÇÃO: os dados do celular dependem destes nomes. Não renomear; mudanças de estrutura só com
// nova versão + migração em onupgradeneeded, sem apagar registros (ver CLAUDE.md).
const DB_NAME = "peso-medidas";
const MEASUREMENTS = "measurements";
const META = "meta";

let dbp: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  dbp ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(MEASUREMENTS)) db.createObjectStore(MEASUREMENTS, { keyPath: "id" });
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
    };
    req.onsuccess = () => resolve(req.result);
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
