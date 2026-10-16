// Relatório de taxa de acerto dos sinais, por setup SMC e por sessão.
//
// Uso:
//   deno run --allow-net --allow-env scripts/signal-report.ts
//
// Env: SUPABASE_URL, SERVICE_KEY (service_role).
// Lê signal_outcomes (tabela de resultados fechados) e agrega tp/sl/expired.
// "acerto" = tp / (tp + sl) — os expirados não contam, igual ao painel.

const url = Deno.env.get('SUPABASE_URL');
const key = Deno.env.get('SERVICE_KEY');
if (!url || !key) {
  console.error('Faltam SUPABASE_URL e/ou SERVICE_KEY no ambiente.');
  Deno.exit(1);
}

interface Outcome {
  result: string;
  smc_setup: string | null;
  created_at: string;
}

interface Bucket { tp: number; sl: number; expired: number; other: number }

function emptyBucket(): Bucket {
  return { tp: 0, sl: 0, expired: 0, other: 0 };
}

async function fetchOutcomes(): Promise<Outcome[]> {
  const res = await fetch(
    `${url}/rest/v1/signal_outcomes?select=result,smc_setup,created_at`,
    { headers: { apikey: key as string, Authorization: `Bearer ${key}` } },
  );
  if (!res.ok) throw new Error(`REST ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return await res.json();
}

// Mesmas fronteiras de sessão que generate-crypto-signals (WAT = UTC+1).
function sessionOf(iso: string): string {
  const d = new Date(iso);
  const m = ((d.getUTCHours() + 1) % 24) * 60 + d.getUTCMinutes();
  if (m < 60) return 'Asia Night';
  if (m < 180) return 'Tokyo';
  if (m < 300) return 'Asia';
  if (m < 390) return 'Sydney';
  if (m < 480) return 'Asia/Europa';
  if (m < 570) return 'Frankfurt';
  if (m < 660) return 'Pre-Londres';
  if (m < 750) return 'Londres';
  if (m < 810) return 'Londres MD';
  if (m < 870) return 'Overlap';
  if (m < 960) return 'Nova York';
  if (m < 1020) return 'NY Tarde';
  if (m < 1050) return 'NY Tarde+';
  if (m < 1115) return 'NY Fechamento';
  if (m < 1200) return 'Pos-NY';
  if (m < 1295) return 'Noite';
  return 'Asia Night';
}

function add(b: Bucket, r: Outcome) {
  if (r.result === 'tp') b.tp++;
  else if (r.result === 'sl') b.sl++;
  else if (r.result === 'expired') b.expired++;
  else b.other++;
}

function get(m: Map<string, Bucket>, k: string): Bucket {
  let b = m.get(k);
  if (!b) { b = emptyBucket(); m.set(k, b); }
  return b;
}

function acerto(b: Bucket): string {
  const d = b.tp + b.sl;
  return d === 0 ? '   n/a' : `${((100 * b.tp) / d).toFixed(1)}%`.padStart(6);
}

function printTable(title: string, groups: Map<string, Bucket>) {
  console.log(`\n=== ${title} ===`);
  console.log('grupo'.padEnd(16), ' tp', ' sl', 'exp', 'acerto');
  const rows = [...groups.entries()].sort((a, b) => (b[1].tp + b[1].sl) - (a[1].tp + a[1].sl));
  for (const [name, b] of rows) {
    console.log(
      name.padEnd(16),
      String(b.tp).padStart(3),
      String(b.sl).padStart(3),
      String(b.expired).padStart(4),
      acerto(b),
    );
  }
}

const rows = await fetchOutcomes();
const bySetup = new Map<string, Bucket>();
const bySession = new Map<string, Bucket>();
const total = emptyBucket();
for (const r of rows) {
  add(total, r);
  add(get(bySetup, r.smc_setup ?? '(null)'), r);
  add(get(bySession, sessionOf(r.created_at)), r);
}

console.log(`Total de resultados: ${rows.length}  (tp ${total.tp} / sl ${total.sl} / expired ${total.expired})`);
console.log(`Acerto global: ${acerto(total).trim()}`);
printTable('Por setup SMC', bySetup);
printTable('Por sessão (WAT, do created_at)', bySession);
