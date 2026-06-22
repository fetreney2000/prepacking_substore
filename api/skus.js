import dbConnect from '../_db.js';
import { getSKUModel } from '../_schemas.js';

function formatDoc(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  return obj;
}

async function getNextId(Model) {
  const last = await Model.findOne().sort({ _id: -1 }).select('_id').lean();
  return (last?._id || 0) + 1;
}

export default async function handler(req, res) {
  await dbConnect();
  const SKU = getSKUModel();
  try {
    switch (req.method) {
      case 'GET': {
        const { groupId } = req.query;
        let query = {};
        if (groupId) query.groupId = parseInt(groupId);
        const skus = await SKU.find(query).sort({ _id: 1 }).lean();
        return res.status(200).json(skus.map(formatDoc));
      }
      case 'POST': {
        const { kod, nama, saizPek, groupId, enabled, fullStockAlways, notes, stokSemasa, usageMonth1, usageMonth2, usageMonth3, useManualLevels, minManual, penimbalManual, maksManual } = req.body;
        if (!kod || !nama) return res.status(400).json({ error: 'Kod dan nama diperlukan' });
        const existing = await SKU.findOne({ kod }).lean();
        if (existing) return res.status(400).json({ error: `Kod ${kod} sudah wujud` });
        const nextId = await getNextId(SKU);
        const created = await SKU.create({
          _id: nextId,
          kod,
          nama,
          saizPek: saizPek || 1,
          groupId: groupId || null,
          enabled: enabled !== undefined ? enabled : true,
          fullStockAlways: fullStockAlways || false,
          notes: notes || '',
          stokSemasa: stokSemasa || 0,
          usageMonth1: usageMonth1 || 0,
          usageMonth2: usageMonth2 || 0,
          usageMonth3: usageMonth3 || 0,
          useManualLevels: useManualLevels || false,
          minManual: minManual || 0,
          penimbalManual: penimbalManual || 0,
          maksManual: maksManual || 0
        });
        return res.status(201).json(formatDoc(created));
      }
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
