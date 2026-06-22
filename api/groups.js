import dbConnect from '../lib/_db.js';
import { getGroupModel } from '../lib/_schemas.js';

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
  const Group = getGroupModel();
  try {
    switch (req.method) {
      case 'GET': {
        const groups = await Group.find().sort({ name: 1 }).lean();
        return res.status(200).json(groups.map(formatDoc));
      }
      case 'POST': {
        const nextId = await getNextId(Group);
        const { name, notes } = req.body;
        if (!name) return res.status(400).json({ error: 'Nama kumpulan diperlukan' });
        const created = await Group.create({ _id: nextId, name, notes: notes || '' });
        return res.status(201).json(formatDoc(created));
      }
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
