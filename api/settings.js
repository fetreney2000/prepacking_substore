import dbConnect from '../lib/_db.js';
import { getSettingModel } from '../lib/_schemas.js';

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
  const Setting = getSettingModel();
  try {
    switch (req.method) {
      case 'GET': {
        let settings = await Setting.findById(3).lean();
        if (!settings) {
          settings = await Setting.create({ _id: 3 });
          settings = settings.toObject();
        }
        const { _id, __v, ...rest } = settings;
        return res.status(200).json({ id: _id, ...rest });
      }
      case 'PUT': {
        const { _id, id, ...fields } = req.body;
        const updated = await Setting.findByIdAndUpdate(3, fields, { new: true, upsert: true }).lean();
        return res.status(200).json(formatDoc(updated));
      }
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
