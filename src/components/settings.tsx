import { useEffect, useState } from "preact/hooks";
import type { Store } from "../app";
import { requestPersist } from "../db";
import { isMeasurement, type Goals } from "../model";

const isGoals = (g: unknown): g is Goals =>
  !!g && typeof g === "object" &&
  Object.entries(g as Record<string, unknown>).every(([k, v]) =>
    (k === "weight" || k === "waist") && !!v && typeof v === "object" &&
    typeof (v as Record<string, unknown>).target === "number" && typeof (v as Record<string, unknown>).startValue === "number");

export function Settings({ store }: { store: Store }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

  useEffect(() => { requestPersist().then(setPersisted); }, []);

  async function exportBackup() {
    const name = `medidas-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const blob = new Blob([JSON.stringify({ app: "peso-medidas", version: 1, exportedAt: new Date().toISOString(), measurements: store.measurements, goals: store.goals })], { type: "application/json" });
    const file = new File([blob], name, { type: "application/json" });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Backup das medidas" });
        setMsg("Backup compartilhado.");
        return;
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMsg("Backup baixado.");
  }

  async function importBackup(file: File) {
    try {
      const data = JSON.parse(await file.text());
      const list: unknown[] = Array.isArray(data) ? data : data?.measurements;
      if (!Array.isArray(list)) throw new Error("arquivo sem medições");
      const valid = list.filter(isMeasurement);
      const goals = isGoals(data?.goals) ? data.goals : undefined;
      if (!valid.length && !goals) throw new Error("nenhum registro válido");
      if (!confirm(`Importar ${valid.length} medição(ões)${goals ? " e as metas" : ""}? Medições iguais são substituídas; as demais são mantidas.`)) return;
      await store.merge(valid, goals);
      setMsg(`${valid.length} medição(ões) importada(s).`);
    } catch (e) {
      setMsg(`Não foi possível importar: ${(e as Error).message}`);
    }
  }

  return (
    <>
      <header class="page-head"><h1>Ajustes</h1></header>

      <section class="card">
        <h2>Backup</h2>
        <p class="muted small">Os dados ficam só neste celular. Exporte um backup de vez em quando e guarde no Arquivos/iCloud.</p>
        <div class="actions">
          <button type="button" class="btn primary" onClick={exportBackup}>Exportar backup</button>
          <label class="btn ghost file">
            Importar backup
            <input type="file" accept="application/json,.json" onChange={(e) => {
              const f = e.currentTarget.files?.[0];
              if (f) importBackup(f);
              e.currentTarget.value = "";
            }} />
          </label>
        </div>
        {msg && <p class="note" role="status">{msg}</p>}
      </section>

      <section class="card">
        <h2>Armazenamento</h2>
        <ul class="facts">
          <li><span class="muted">Medições</span><b>{store.measurements.length}</b></li>
          <li><span class="muted">Metas</span><b>{Object.keys(store.goals).length}</b></li>
          <li><span class="muted">Instalado na tela de início</span><b>{standalone ? "sim" : "não"}</b></li>
          <li><span class="muted">Armazenamento protegido</span><b>{persisted == null ? "—" : persisted ? "sim" : "não"}</b></li>
        </ul>
        {!standalone && (
          <p class="muted small">Para usar como app: no Safari, toque em <b>Compartilhar</b> → <b>Adicionar à Tela de Início</b>.</p>
        )}
      </section>

      <section class="card">
        <h2>Apagar tudo</h2>
        <p class="muted small">Remove todas as medições e metas deste celular. Exporte um backup antes.</p>
        <button type="button" class="btn ghost danger" onClick={async () => {
          if (!store.measurements.length && !Object.keys(store.goals).length) return;
          if (confirm("Apagar todas as medições e metas?") && confirm("Tem certeza? Não dá para desfazer.")) {
            await store.clear();
            setMsg("Dados apagados.");
          }
        }}>Apagar todos os dados</button>
      </section>
    </>
  );
}
