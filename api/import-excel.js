import dbConnect from '../_db.js';
import { getSKUModel } from '../_schemas.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  await dbConnect();
  const SKU = getSKUModel();

  try {
    const { filename, rows } = req.body;
    if (!rows || !Array.isArray(rows)) {
      return res.status(400).json({ error: 'Data baris tidak sah' });
    }

    const allSkus = await SKU.find().lean();
    const results = { matched: [], notFound: [], updated: 0, errors: 0 };

    const normalizeStr = (s) => (s || '').toString().trim().toUpperCase();

    for (const row of rows) {
      const codeCol = row['Drug / Non Drug Code'] || row['code'] || '';
      const descCol = row['Drug / Non Drug Description'] || row['description'] || '';
      const qtyCol = row['Quantity Available'] || row['quantity'] || 0;
      const normCode = normalizeStr(codeCol);
      const normDesc = normalizeStr(descCol);

      let sku = allSkus.find(s => normalizeStr(s.kod) === normCode);
      if (!sku) {
        sku = allSkus.find(s => normalizeStr(s.nama) === normDesc);
      }

      if (sku) {
        const qty = parseInt(qtyCol) || 0;
        await SKU.findByIdAndUpdate(sku._id, { stokSemasa: qty });
        results.matched.push({ kod: sku.kod, nama: sku.nama, qty });
        results.updated++;
      } else {
        results.notFound.push({ kod: codeCol, nama: descCol });
        results.errors++;
      }
    }

    return res.status(200).json({
      success: true,
      filename: filename || 'unknown',
      updated: results.updated,
      notFound: results.errors,
      matched: results.matched,
      unmatched: results.notFound
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
