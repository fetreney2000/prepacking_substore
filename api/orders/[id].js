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
  await dbConnect();
  const Order = getOrderModel();
  const OrderItem = getOrderItemModel();
  const SKU = getSKUModel();
  const { id } = req.query;
  const numId = parseInt(id);
  if (isNaN(numId)) return res.status(400).json({ error: 'ID tidak sah' });

  try {
    switch (req.method) {
      case 'GET': {
        const order = await Order.findById(numId).lean();
        if (!order) return res.status(404).json({ error: 'Pesanan tidak dijumpai' });
        const items = await OrderItem.find({ orderId: numId }).sort({ _id: 1 }).lean();
        const formatted = formatDoc(order);
        formatted.items = items.map(formatDoc);
        return res.status(200).json(formatted);
      }
      case 'PUT': {
        const { tarikh, namaPembuat, tempohMinggu, notes, items } = req.body;
        const existing = await Order.findById(numId);
        if (!existing) return res.status(404).json({ error: 'Pesanan tidak dijumpai' });
        const updateFields = {};
        if (tarikh !== undefined) updateFields.tarikh = tarikh;
        if (namaPembuat !== undefined) updateFields.namaPembuat = namaPembuat;
        if (tempohMinggu !== undefined) updateFields.tempohMinggu = tempohMinggu;
        if (notes !== undefined) updateFields.notes = notes;
        await Order.findByIdAndUpdate(numId, updateFields);
        if (items && Array.isArray(items)) {
          await OrderItem.deleteMany({ orderId: numId });
          if (items.length > 0) {
            let itemNextId = await getNextId(OrderItem);
            for (const item of items) {
              let skuId = item.skuId || null;
              if (!skuId && item.kod) {
                const sku = await SKU.findOne({ kod: item.kod }).lean();
                if (sku) skuId = sku._id;
              }
              await OrderItem.create({
                _id: itemNextId++,
                orderId: numId,
                skuId: skuId,
                kod: item.kod,
                qtyOrdered: item.qtyOrdered || 0,
                notes: item.notes || ''
              });
            }
          }
        }
        const updatedOrder = await Order.findById(numId).lean();
        const updatedItems = await OrderItem.find({ orderId: numId }).sort({ _id: 1 }).lean();
        const result = formatDoc(updatedOrder);
        result.items = updatedItems.map(formatDoc);
        return res.status(200).json(result);
      }
      case 'DELETE': {
        const deleted = await Order.findByIdAndDelete(numId);
        if (!deleted) return res.status(404).json({ error: 'Pesanan tidak dijumpai' });
        await OrderItem.deleteMany({ orderId: numId });
        return res.status(200).json({ success: true });
      }
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
