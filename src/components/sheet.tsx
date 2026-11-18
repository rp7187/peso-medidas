import { useEffect } from "preact/hooks";
import type { ComponentChildren } from "preact";

/** Folha que sobe de baixo (formulários). */
export function Sheet({ title, onClose, onSubmit, actions, children }: {
  title: string;
  onClose: () => void;
  onSubmit: (e: Event) => void;
  actions: ComponentChildren;
  children: ComponentChildren;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div class="sheet-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div class="sheet-wrap" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <form class="sheet" onSubmit={onSubmit} noValidate>
          <h2 id="sheet-title">{title}</h2>
          {children}
          <div class="actions">{actions}</div>
        </form>
      </div>
    </div>
  );
}
