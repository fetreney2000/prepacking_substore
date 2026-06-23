import dbConnect from '../lib/_db.js';
import { getOrderModel, getOrderItemModel, getSKUModel } from '../lib/_schemas.js';

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
  try {
    await dbConnect();
    const Order = getOrderModel();
    const OrderItem = getOrderItemModel();
    const SKU = getSKUModel();
    switch (req.method) {
      case 'GET': {
        const orders = await Order.find().sort({ tarikh: -1 }).lean();
        const formatted = orders.map(formatDoc);
        // Add item count for each order
        for (const o of formatted) {
          const count = await OrderItem.countDocuments({ orderId: o.id });
          o.itemCount = count;
        }
        return res.status(200).json(formatted);
      }
      case 'POST': {
        const { tarikh, namaPembuat, tempohMinggu, notes, items } = req.body;
        if (!tarikh || !namaPembuat) return res.status(400).json({ error: 'Tarikh dan nama pembuat diperlukan' });
        const nextId = await getNextId(Order);
        const order = await Order.create({
          _id: nextId,
          tarikh,
          namaPembuat,
          tempohMinggu: tempohMinggu || 0,
          notes: notes || ''
        });
        if (items && Array.isArray(items) && items.length > 0) {
          let itemNextId = await getNextId(OrderItem);
          const orderItems = [];
          for (const item of items) {
            let skuId = item.skuId || null;
            if (!skuId && item.kod) {
              const sku = await SKU.findOne({ kod: item.kod }).lean();
              if (sku) skuId = sku._id;
            }
            const created = await OrderItem.create({
              _id: itemNextId++,
              orderId: nextId,
              skuId: skuId,
              kod: item.kod,
              qtyOrdered: item.qtyOrdered || 0,
              notes: item.notes || ''
            });
            orderItems.push(created);
          }
        }
        return res.status(201).json({ success: true, id: nextId });
      }
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
