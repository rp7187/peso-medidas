# Medidas (peso e cintura) — regras do projeto

## Dados no celular: compatibilidade obrigatória

O app está em uso real e os dados existem **só no iPhone** (IndexedDB). Nenhuma versão nova pode perder ou
tornar ilegível o que já foi gravado.

- Nunca renomear o banco (`peso-medidas`), os stores (`measurements`, `meta`) nem a `keyPath` (`id`) em `src/db.ts`.
- Nunca remover nem mudar o significado de campos existentes de `Measurement`/`Goal` (`src/model.ts`).
  Campos novos só como **opcionais**, com leitura tolerante (registro antigo sem o campo continua válido).
- Mudança de estrutura = subir a versão em `indexedDB.open(DB_NAME, N)` e migrar em `onupgradeneeded`
  **sem apagar** registros. Manter `isMeasurement` aceitando o formato antigo (o import de backups antigos depende dele).
- O service worker só apaga caches de arquivos do app (Cache Storage); nunca tocar no IndexedDB nele.
- Antes de publicar uma mudança que toque em `db.ts`/`model.ts`: gravar dados com a versão publicada
  e abrir a versão nova no mesmo endereço/perfil, conferindo que todos os registros continuam lá.

## Publicação

Push na `main` → GitHub Actions faz o build e publica em https://rp7187.github.io/peso-medidas/.
