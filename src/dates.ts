const pad = (n: number) => String(n).padStart(2, "0");
const DAY = 86_400_000;

/** Data local de hoje como "AAAA-MM-DD". */
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
/** "AAAA-MM-DD" → meio-dia UTC daquele dia (estável para contas de dias, sem fuso/horário de verão). */
export const dayNum = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d, 12);
};
export const daysBetween = (a: string, b: string) => Math.round((dayNum(b) - dayNum(a)) / DAY);
export const addDaysISO = (iso: string, n: number) => new Date(dayNum(iso) + n * DAY).toISOString().slice(0, 10);

/** "17/11/26" */
export const fmtDate = (iso: string) => new Date(dayNum(iso)).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "UTC" });
/** "17/11" */
export const fmtShort = (iso: string) => new Date(dayNum(iso)).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
/** "nov/26" */
export const fmtMonth = (iso: string) =>
  new Date(dayNum(iso)).toLocaleDateString("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" }).replace(". de ", "/").replace(" de ", "/").replace(".", "");

/** "há 7 dias", "ontem", "hoje" */
export function relDays(iso: string): string {
  const d = daysBetween(iso, todayISO());
  if (d <= 0) return "hoje";
  if (d === 1) return "ontem";
  if (d < 14) return `há ${d} dias`;
  return `há ${Math.round(d / 7)} semanas`;
}
