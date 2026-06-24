import mongoose from 'mongoose';

const SettingsSchema = new mongoose.Schema({
  _id: { type: Number, default: 3 },
  minWeeks:     { type: Number, default: 2 },
  bufferWeeks:  { type: Number, default: 4 },
  maxWeeks:     { type: Number, default: 6 },
  defaultFilename: { type: String, default: "substor_bulk_prabungkus" },
  appTitle:     { type: String, default: "Sistem Inventori Farmasi" }
});

const GroupsSchema = new mongoose.Schema({
  _id:   { type: Number },
  name:  { type: String, required: true },
  notes: { type: String, default: "" }
});

const SkusSchema = new mongoose.Schema({
  _id:              { type: Number },
  kod:              { type: String, required: true },
  nama:             { type: String, required: true },
  saizPek:          { type: Number, required: true, default: 1 },
  groupId:          { type: Number, default: null },
  enabled:          { type: Boolean, default: true },
  fullStockAlways:  { type: Boolean, default: false },
  notes:            { type: String, default: "" },
  stokSemasa:       { type: Number, default: 0 },
  usageMonth1:      { type: Number, default: 0 },
  usageMonth2:      { type: Number, default: 0 },
  usageMonth3:      { type: Number, default: 0 },
  useManualLevels:  { type: Boolean, default: false },
  minManual:        { type: Number, default: 0 },
  penimbalManual:   { type: Number, default: 0 },
  maksManual:       { type: Number, default: 0 }
});
SkusSchema.index({ kod: 1 }, { unique: true });
SkusSchema.index({ groupId: 1 });

const OrdersSchema = new mongoose.Schema({
  _id:          { type: Number },
  tarikh:       { type: String, required: true },
  namaPembuat:  { type: String, required: true },
  tempohMinggu: { type: Number, default: 0 },
  notes:        { type: String, default: "" }
});
OrdersSchema.index({ tarikh: -1 });

const OrderItemsSchema = new mongoose.Schema({
  _id:        { type: Number },
  orderId:    { type: Number, required: true },
  skuId:      { type: Number, default: null },
  kod:        { type: String, required: true },
  qtyOrdered: { type: Number, required: true },
  notes:      { type: String, default: "" }
});
OrderItemsSchema.index({ orderId: 1 });
OrderItemsSchema.index({ skuId: 1 });

export function getSettingModel() {
  return mongoose.models.Setting || mongoose.model('Setting', SettingsSchema);
}
export function getGroupModel() {
  return mongoose.models.Group || mongoose.model('Group', GroupsSchema);
}
export function getSKUModel() {
  return mongoose.models.SKU || mongoose.model('SKU', SkusSchema);
}
export function getOrderModel() {
  return mongoose.models.Order || mongoose.model('Order', OrdersSchema);
}
export function getOrderItemModel() {
  return mongoose.models.OrderItem || mongoose.model('OrderItem', OrderItemsSchema);
}
