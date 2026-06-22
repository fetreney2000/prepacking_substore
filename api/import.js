import dbConnect from '../_db.js';
import { getSettingModel, getGroupModel, getSKUModel, getOrderModel, getOrderItemModel } from '../_schemas.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  await dbConnect();
  const Setting = getSettingModel();
  const Group = getGroupModel();
  const SKU = getSKUModel();
  const Order = getOrderModel();
  const OrderItem = getOrderItemModel();

  try {
    const data = req.body;

    if (!data || !Array.isArray(data.settings) || !Array.isArray(data.groups) ||
        !Array.isArray(data.skus) || !Array.isArray(data.orders) || !Array.isArray(data.orderItems)) {
      return res.status(400).json({ error: 'Format JSON tidak sah. Pastikan settings, groups, skus, orders, dan orderItems adalah array.' });
    }

    await Promise.all([
      Setting.deleteMany({}),
      Group.deleteMany({}),
      SKU.deleteMany({}),
      Order.deleteMany({}),
      OrderItem.deleteMany({})
    ]);

    const normalize = (doc) => {
      const { id, ...rest } = doc;
      const normalized = { _id: id, ...rest };
      delete normalized.__v;
      return normalized;
    };

    if (data.settings.length) {
      await Setting.insertMany(data.settings.map(normalize));
    }
    if (data.groups.length) {
      await Group.insertMany(data.groups.map(normalize));
    }
    if (data.skus.length) {
      await SKU.insertMany(data.skus.map(normalize));
    }
    if (data.orders.length) {
      await Order.insertMany(data.orders.map(normalize));
    }
    if (data.orderItems.length) {
      await OrderItem.insertMany(data.orderItems.map(normalize));
    }

    const orphaned = await OrderItem.find({ skuId: null }).lean();
    for (const item of orphaned) {
      if (!item.kod) continue;
      const sku = await SKU.findOne({ kod: item.kod }).lean();
      if (sku) {
        await OrderItem.updateOne({ _id: item._id }, { skuId: sku._id });
      }
    }

    return res.status(200).json({
      success: true,
      counts: {
        settings: data.settings.length,
        groups: data.groups.length,
        skus: data.skus.length,
        orders: data.orders.length,
        orderItems: data.orderItems.length
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
