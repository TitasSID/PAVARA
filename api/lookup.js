// Vercel serverless funkcija: kviečia oficialų VIES registrą serverio pusėje
// (naršyklė VIES tiesiai kviesti negali). Nemokama, be rakto.
export default async function handler(req, res) {
  try {
    const raw = (req.query.vat || '').toString().trim().toUpperCase().replace(/\s+/g, '');
    if (!raw) return res.status(400).json({ ok: false, error: 'no_input' });

    // atskiriam šalį ir numerį: "LT100001738313" arba tik skaitmenys (tada LT)
    const m = raw.match(/^([A-Z]{2})?(\d{6,14})$/);
    if (!m) return res.status(200).json({ ok: false, error: 'not_vat' });
    const country = m[1] || 'LT';
    const number = m[2];

    const r = await fetch('https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ countryCode: country, vatNumber: number })
    });
    if (!r.ok) return res.status(200).json({ ok: false, error: 'vies_' + r.status });

    const d = await r.json();
    const valid = (d.valid !== undefined) ? d.valid : d.isValid;
    if (!valid) return res.status(200).json({ ok: false, error: 'invalid', country, number });

    const clean = s => (s && s !== '---' ? String(s).replace(/\n/g, ', ').replace(/\s+/g, ' ').trim() : '');
    return res.status(200).json({
      ok: true,
      country, number,
      vat: country + number,
      name: clean(d.name || d.traderName),
      address: clean(d.address || d.traderAddress)
    });
  } catch (e) {
    return res.status(200).json({ ok: false, error: 'exception' });
  }
}
