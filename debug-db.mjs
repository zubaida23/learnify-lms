const supabaseUrl = 'https://igynhexmzzrkshlyepqj.supabase.co';
const supabaseAnon = 'sb_publishable_U68d0hm7nazLN4DnM5kprQ_hPPLDyev';

const headers = {
  'apikey': supabaseAnon,
  'Authorization': `Bearer ${supabaseAnon}`,
  'Content-Type': 'application/json',
};

async function fetchJson(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { res, json };
}

const root = `${supabaseUrl}/rest/v1`;
const cases = [
  { label: 'courses', query: `${root}/courses?select=*&limit=20` },
  { label: 'profiles', query: `${root}/profiles?select=*&limit=20` },
  { label: 'enrollments', query: `${root}/enrollments?select=*&limit=20` },
];

for (const item of cases) {
  const { res, json } = await fetchJson(item.query, { headers });
  console.log('CASE', item.label, 'STATUS', res.status, 'OK', res.ok);
  console.log(JSON.stringify(json, null, 2).slice(0, 4000));
}
