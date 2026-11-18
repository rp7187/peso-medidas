import { render } from "preact";
import { App } from "./app";
import "./styles.css";

render(<App />, document.getElementById("app")!);

// Offline: o service worker guarda o app no celular (só no build; no dev atrapalharia o recarregamento).
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("./sw.js");
      await navigator.serviceWorker.ready;
      // Arquivos já carregados nesta 1ª visita (JS/CSS com hash) vão para o cache também.
      const urls = performance.getEntriesByType("resource").map((r) => r.name).filter((u) => u.startsWith(location.origin));
      (reg.active ?? navigator.serviceWorker.controller)?.postMessage({ type: "cache", urls: [location.href, ...urls] });
    } catch { /* sem service worker: o app funciona, só não offline */ }
  });
}
