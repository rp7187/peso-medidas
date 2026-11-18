import { useEffect, useState } from "preact/hooks";

/** Relógio que re-renderiza a cada `ms` (e ao voltar para o app, que no iPhone congela em segundo plano). */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, ms);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, [ms]);
  return now;
}
