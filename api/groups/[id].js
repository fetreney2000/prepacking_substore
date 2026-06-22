import dbConnect from '../lib/_db.js';
import { getGroupModel, getSKUModel } from '../lib/_schemas.js';

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
  const Group = getGroupModel();
  const SKU = getSKUModel();
  const { id } = req.query;
  const numId = parseInt(id);
  if (isNaN(numId)) return res.status(400).json({ error: 'ID tidak sah' });

  try {
    switch (req.method) {
      case 'PUT': {
        const { _id, id: rid, ...fields } = req.body;
        const updated = await Group.findByIdAndUpdate(numId, fields, { new: true }).lean();
        if (!updated) return res.status(404).json({ error: 'Kumpulan tidak dijumpai' });
        return res.status(200).json(formatDoc(updated));
      }
      case 'DELETE': {
        const skuCount = await SKU.countDocuments({ groupId: numId });
        if (skuCount > 0) {
          return res.status(400).json({ error: `Tidak boleh padam: terdapat ${skuCount} SKU dalam kumpulan ini.` });
        }
        const deleted = await Group.findByIdAndDelete(numId);
        if (!deleted) return res.status(404).json({ error: 'Kumpulan tidak dijumpai' });
        return res.status(200).json({ success: true });
      }
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
