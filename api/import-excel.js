import dbConnect from '../lib/_db.js';
import { getSKUModel } from '../lib/_schemas.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await dbConnect();
    const SKU = getSKUModel();
    const { filename, rows } = req.body;
    if (!rows || !Array.isArray(rows)) {
      return res.status(400).json({ error: 'Data baris tidak sah' });
    }

    const allSkus = await SKU.find().lean();
    const normalizeStr = (s) => (s || '').toString().trim().toUpperCase();

    const updated = [];
    const missingFromExcel = [...allSkus];
    const notFoundInApp = [];

    for (const row of rows) {
      const codeCol = row['Drug / Non Drug Code'] || row['code'] || '';
      const descCol = row['Drug / Non Drug Description'] || row['description'] || '';
      const qtyCol = row['Quantity Available'] || row['quantity'] || 0;
      const normCode = normalizeStr(codeCol);
      const normDesc = normalizeStr(descCol);
      const qty = parseInt(qtyCol) || 0;

      let sku = allSkus.find(s => normalizeStr(s.kod) === normCode);
      if (!sku) {
        sku = allSkus.find(s => normalizeStr(s.nama) === normDesc);
      }

      if (sku) {
        const oldQty = sku.stokSemasa || 0;
        if (oldQty !== qty) {
          await SKU.findByIdAndUpdate(sku._id, { stokSemasa: qty });
          updated.push({
            kod: sku.kod,
            nama: sku.nama,
            oldQty,
            newQty: qty
          });
        }
        const idx = missingFromExcel.findIndex(s => String(s._id) === String(sku._id));
        if (idx !== -1) missingFromExcel.splice(idx, 1);
      } else {
        notFoundInApp.push({ kod: codeCol, nama: descCol, qty });
      }
    }

    return res.status(200).json({
      success: true,
      filename: filename || 'unknown',
      updated,
      updatedCount: updated.length,
      missingFromExcel: missingFromExcel.map(s => ({
        kod: s.kod,
        nama: s.nama,
        stokSemasa: s.stokSemasa || 0
      })),
      missingFromExcelCount: missingFromExcel.length,
      notFoundInAppCount: notFoundInApp.length
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
