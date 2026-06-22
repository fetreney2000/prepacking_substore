import dbConnect from '../lib/_db.js';
import { getOrderItemModel } from '../lib/_schemas.js';

function formatDoc(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  return obj;
}

export default async function handler(req, res) {
  try {
    await dbConnect();
    const OrderItem = getOrderItemModel();
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const { orderId } = req.query;
    if (!orderId) return res.status(400).json({ error: 'orderId diperlukan' });
    const items = await OrderItem.find({ orderId: parseInt(orderId) }).sort({ _id: 1 }).lean();
    return res.status(200).json(items.map(formatDoc));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
