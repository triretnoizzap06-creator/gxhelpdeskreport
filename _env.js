// Baca environment variable dengan toleran: nama dicocokkan tanpa beda huruf besar/kecil & spasi,
// dan nilai di-trim (spasi/enter tak sengaja saat copy-paste di Vercel sering bikin env "tidak terbaca").
export function envGet(...names) {
  for (const n of names) {
    const v = process.env[n];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  const want = names.map(n => n.toUpperCase());
  for (const [k, v] of Object.entries(process.env)) {
    if (want.includes(k.trim().toUpperCase()) && v != null && String(v).trim()) return String(v).trim();
  }
  return '';
}
