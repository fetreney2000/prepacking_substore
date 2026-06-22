import dbConnect from '../_db.js';
import { getSKUModel, getOrderItemModel } from '../_schemas.js';

function formatDoc(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  return obj;
}

export default async function handler(req, res) {
  await dbConnect();
  const SKU = getSKUModel();
  const OrderItem = getOrderItemModel();
  const { id } = req.query;
  const numId = parseInt(id);
  if (isNaN(numId)) return res.status(400).json({ error: 'ID tidak sah' });

  try {
    switch (req.method) {
      case 'GET': {
        const sku = await SKU.findById(numId).lean();
        if (!sku) return res.status(404).json({ error: 'SKU tidak dijumpai' });
        return res.status(200).json(formatDoc(sku));
      }
      case 'PUT': {
        const { _id, id: rid, ...fields } = req.body;
        if (fields.kod) {
          const existing = await SKU.findOne({ kod: fields.kod, _id: { $ne: numId } }).lean();
          if (existing) return res.status(400).json({ error: `Kod ${fields.kod} sudah wujud` });
          const oldSku = await SKU.findById(numId).lean();
          if (oldSku && oldSku.kod !== fields.kod) {
            await OrderItem.updateMany({ skuId: numId }, { kod: fields.kod });
            await OrderItem.updateMany({ skuId: null, kod: oldSku.kod }, { kod: fields.kod, skuId: numId });
          }
        }
        const updated = await SKU.findByIdAndUpdate(numId, fields, { new: true }).lean();
        if (!updated) return res.status(404).json({ error: 'SKU tidak dijumpai' });
        return res.status(200).json(formatDoc(updated));
      }
      case 'DELETE': {
        const itemCount = await OrderItem.countDocuments({ skuId: numId });
        if (itemCount > 0) {
          return res.status(400).json({ error: `Tidak boleh padam: terdapat ${itemCount} item pesanan yang merujuk SKU ini.` });
        }
        const deleted = await SKU.findByIdAndDelete(numId);
        if (!deleted) return res.status(404).json({ error: 'SKU tidak dijumpai' });
        return res.status(200).json({ success: true });
      }
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
