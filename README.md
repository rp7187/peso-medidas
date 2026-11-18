# Medidas · Peso e cintura

Registro semanal de **peso** e **circunferência abdominal**, com evolução (variação entre medições, acumulado,
ritmo semanal) e **metas** para as duas medidas.

Endereço: **https://rp7187.github.io/peso-medidas/**

- Roda no Safari do iPhone e pode ser instalado na tela de início (PWA), sem loja de apps.
- **Todos os dados ficam no celular** (IndexedDB). Nada é enviado para servidor.
- Funciona offline depois da primeira visita. Segue o tema claro/escuro do iPhone.
- Leve: ~17 KB (gzip) de JS + CSS; única dependência é o Preact.

## Uso no iPhone

1. Abrir o endereço no **Safari** → **Compartilhar → Adicionar à Tela de Início**.
2. Usar sempre pelo ícone instalado (ele guarda os dados separado do Safari).
3. **Ajustes → Exportar backup** de tempos em tempos (Arquivos/iCloud).

## O que calcula

- **Última variação**: diferença para a medição anterior (e em quantos dias).
- **Total**: desde a primeira medição.
- **Ritmo**: regressão linear das medições das últimas 8 semanas (unidade por semana).
- **Meta**: progresso a partir do ponto de partida escolhido (primeira medição ou a atual), quanto falta,
  previsão de quando chega no ritmo atual e, com prazo, o ritmo semanal necessário.

## Desenvolvimento

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # dist/ (site estático)
npm run preview   # http://localhost:4173
```

Cada push na `main` publica no GitHub Pages (`.github/workflows/deploy.yml`).
