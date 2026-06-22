import dbConnect from '../_db.js';
import { getSettingModel, getGroupModel, getSKUModel, getOrderModel, getOrderItemModel } from '../_schemas.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  await dbConnect();
  const Setting = getSettingModel();
  const Group = getGroupModel();
  const SKU = getSKUModel();
  const Order = getOrderModel();
  const OrderItem = getOrderItemModel();

  try {
    const settingsArr = await Setting.find().lean();
    const groups = await Group.find().lean();
    const skus = await SKU.find().lean();
    const orders = await Order.find().lean();
    const orderItems = await OrderItem.find().lean();

    const toExport = (doc) => {
      const { _id, __v, ...rest } = doc;
      return { id: _id, ...rest };
    };

    const result = {
      settings: settingsArr.map(toExport),
      groups: groups.map(toExport),
      skus: skus.map(toExport),
      orders: orders.map(toExport),
      orderItems: orderItems.map(toExport),
      exportedAt: new Date().toISOString(),
      version: Date.now()
    };

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
