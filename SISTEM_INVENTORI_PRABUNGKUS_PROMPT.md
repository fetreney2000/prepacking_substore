# Build Prompt: Sistem Inventori Prabungkus Hospital Keningau

You are tasked with producing an **inventory management web application** hosted on **Vercel (Hobby plan)** using **MongoDB Atlas (free tier)** as the database. The frontend is a single-page application in a single HTML file (`Sistem Pengurusan Substor.html`). The backend is a set of **Vercel serverless API routes** (Node.js) that connect to MongoDB Atlas.

---

## ARCHITECTURE OVERVIEW

### Frontend
- **Single HTML file** (`Sistem Pengurusan Substor.html`) containing embedded CSS and JavaScript.
- CSS in a `<style>` block (no preprocessors).
- JavaScript in a single `<script>` block (no bundler, no framework, vanilla JS ES6+).
- All data fetched from the Vercel API endpoints via `fetch()` calls.
- Embedded library: SheetJS/xlsx.js (inlined, minified) for Excel import.
- Language: Malay (Bahasa Malaysia).
- No authentication — single-user application.
- No offline storage — all data loads from MongoDB Atlas on each page render and is saved via API calls.

### Backend (Vercel Serverless Functions)
- Directory structure: `/api/` with one file per resource.
- Runtime: Node.js 18+ with native `fetch` and `es modules` (`type: "module"` in package.json).
- Database: MongoDB Atlas free tier (M0 cluster), connection via `mongoose` npm package.
- Each API route is an async function receiving `(req, res)` and handling CRUD.
- Package.json at project root with dependencies: `mongoose`.

### Project File Structure
```
/
  package.json
  vercel.json
  Sistem Pengurusan Substor.html
  /api/
    _db.js
    _schemas.js
    settings.js
    groups.js
    groups/[id].js
    skus.js
    skus/[id].js
    orders.js
    orders/[id].js
    order-items.js
    import-excel.js
    export.js
    import.js
```

### vercel.json
```json
{
  "version": 2,
  "builds": [
    { "src": "/api/**/*.js", "use": "@vercel/node" },
    { "src": "*.html", "use": "@vercel/static" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/$1" },
    { "src": "/", "dest": "/Sistem%20Pengurusan%20Substor.html" }
  ]
}
```

### package.json
```json
{
  "name": "sistem-inventori-prabungkus",
  "type": "module",
  "dependencies": {
    "mongoose": "^8.0.0"
  },
  "scripts": {
    "dev": "vercel dev"
  }
}
```

### MongoDB Connection (`/api/_db.js`)
```javascript
import mongoose from 'mongoose';
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error('MONGODB_URI environment variable is required');
let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };
export default async function dbConnect() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
```

Set `MONGODB_URI` in Vercel project environment variables. MongoDB Atlas free tier: create M0 cluster, database user, allow `0.0.0.0/0`.

---

## DATA MODEL: NUMERIC ID COMPATIBILITY

The original JSON export uses **integer auto-increment IDs** (`"id": 57`) for all documents. ALL Mongoose schemas use **numeric `_id` fields** that directly store these integer IDs. Foreign keys (`groupId`, `orderId`, `skuId`) are also plain numbers.

### JSON Export Format (from production data)
```json
{
  "settings": [
    { "minWeeks": 2, "bufferWeeks": 4, "maxWeeks": 6, "defaultFilename": "substor_bulk_prabungkus", "appTitle": "Sistem Inventori Prabungkus Hospital Keningau", "id": 3, "layoutMode": "table" }
  ],
  "groups": [
    { "name": "APPL (Tablet & Kapsul)", "notes": "", "id": 1 },
    { "name": "APPL (Eksternal)", "notes": "", "id": 2 }
  ],
  "skus": [
    { "id": 57, "kod": "C08CA01000T1002XX", "nama": "Amlodipine 10 mg Tablet", "saizPek": 100, "groupId": 1, "enabled": true, "fullStockAlways": false, "notes": "", "stokSemasa": 40600, "usageMonth1": 91500, "usageMonth2": 210000, "usageMonth3": 0, "useManualLevels": false, "minManual": 0, "penimbalManual": 0, "maksManual": 0 },
    { "kod": "D02AB00000G1001b", "nama": "Zinc Oxide Cream (15%)", "saizPek": 100, "groupId": 6, "notes": "Sekarang guna stok komersial. Stok under IPP Standard Substore.", "stokSemasa": 0, "usageMonth1": 0, "usageMonth2": 0, "usageMonth3": 0, "useManualLevels": false, "minManual": 0, "penimbalManual": 0, "maksManual": 0, "id": 102, "enabled": false }
  ],
  "orders": [
    { "tarikh": "2026-05-04", "namaPembuat": "Ahmad Fetre", "notes": "", "id": 1 },
    { "tarikh": "2026-05-18", "namaPembuat": "Ahmad Fetre", "tempohMinggu": 4, "notes": "", "id": 2 }
  ],
  "orderItems": [
    { "orderId": 1, "kod": "C08CA01000T1002XX", "qtyOrdered": 130600, "id": 30, "skuId": 57 },
    { "orderId": 3, "kod": "C08CA01000T1001XX", "qtyOrdered": 30800, "id": 170 },
    { "orderId": 4, "kod": "P1660550001", "skuId": 126, "qtyOrdered": 1, "notes": "", "id": 231 }
  ],
  "exportedAt": "2026-06-22T01:46:40.413Z",
  "version": 1782092800413
}
```

### Critical Edge Cases from the Real Data

1. **`id` field position varies** — some documents have `"id"` at the start, some at the end. Both work since JSON.parse is order-independent.
2. **`enabled` may be absent** — several SKUs lack an `enabled` field entirely. Schemas must default `enabled` to `true`.
3. **`fullStockAlways` may be absent** — default to `false`.
4. **`tempohMinggu` may be absent** — order 1 has no `tempohMinggu`. Default to `0`.
5. **`notes` may be absent** — order 1 and order 3 items have no `notes` field. Default to `""`.
6. **`skuId` may be absent** — all order 3 items lack `skuId`. Default to `null`. Must backfill on import.
7. **Settings is an array with one element** — not a single object. `id: 3`, not `_id: 1`.
8. **`exportedAt` and `version` are top-level metadata** — included on export, ignored/stripped on import.

### Import Rule
When `POST /api/import` receives the JSON:
- Map every document's `id` field → MongoDB `_id` field.
- If a document lacks `id`, generate one via `getNextId()`.
- If `exportedAt` or `version` exists at the top level, ignore them — they are metadata only.
- After bulk insert, backfill orphaned `orderItems` where `skuId` is null: match by `kod` against the `skus` collection.

### Export Rule
When `GET /api/export` returns data:
- Every document's MongoDB `_id` is returned as `id`.
- `__v` (Mongoose version key) is stripped.
- Wrap settings as an array (even though MongoDB stores only one).
- Add `exportedAt` (ISO timestamp) and `version` (`Date.now()`) at the top level.

---

## MONGOOSE SCHEMAS (`/api/_schemas.js`)

All schemas in one file. Export models using `mongoose.models[name] || mongoose.model(name, schema)`.

### Setting Schema
```javascript
const SettingsSchema = new mongoose.Schema({
  _id: { type: Number, default: 3 },
  minWeeks:     { type: Number, default: 2 },
  bufferWeeks:  { type: Number, default: 4 },
  maxWeeks:     { type: Number, default: 6 },
  defaultFilename: { type: String, default: "substor_bulk_prabungkus" },
  appTitle:     { type: String, default: "Sistem Inventori Prabungkus Hospital Keningau" },
  layoutMode:   { type: String, enum: ["table", "card"], default: "table" }
});
```

### Group Schema
```javascript
const GroupsSchema = new mongoose.Schema({
  _id:   { type: Number },
  name:  { type: String, required: true },
  notes: { type: String, default: "" }
});
```

### SKU Schema
```javascript
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
```

### Order Schema
```javascript
const OrdersSchema = new mongoose.Schema({
  _id:          { type: Number },
  tarikh:       { type: String, required: true },
  namaPembuat:  { type: String, required: true },
  tempohMinggu: { type: Number, default: 0 },
  notes:        { type: String, default: "" }
});
OrdersSchema.index({ tarikh: -1 });
```

### OrderItem Schema
```javascript
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
```

---

## IMPORT / EXPORT ENDPOINTS (Critical for Data Compatibility)

### Export (`GET /api/export`)

Read all 5 collections. Return a JSON object matching the exact production format:

```javascript
export default async function handler(req, res) {
  await dbConnect();
  const settingsArr = await Setting.find().lean();
  const groups      = await Group.find().lean();
  const skus        = await SKU.find().lean();
  const orders      = await Order.find().lean();
  const orderItems  = await OrderItem.find().lean();

  const toExport = (doc) => {
    const { _id, __v, ...rest } = doc;
    return { id: _id, ...rest };
  };

  const result = {
    settings:   settingsArr.map(toExport),
    groups:     groups.map(toExport),
    skus:       skus.map(toExport),
    orders:     orders.map(toExport),
    orderItems: orderItems.map(toExport),
    exportedAt: new Date().toISOString(),
    version:    Date.now()
  };

  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(result);
}
```

Key requirements:
- Settings MUST be an array (even though only one record exists).
- Every document has `id` (not `_id`).
- `__v` is removed from every document.
- The object includes `exportedAt` (ISO string) and `version` (millisecond timestamp) at top level.

### Import (`POST /api/import`)

Accept the full export JSON. This endpoint must handle all edge cases from the production data:

```javascript
export default async function handler(req, res) {
  await dbConnect();
  const data = req.body;

  // Validate
  if (!data || !Array.isArray(data.settings) || !Array.isArray(data.groups) ||
      !Array.isArray(data.skus) || !Array.isArray(data.orders) || !Array.isArray(data.orderItems)) {
    return res.status(400).json({ error: 'Format JSON tidak sah. Pastikan settings, groups, skus, orders, dan orderItems adalah array.' });
  }

  // Clear all collections
  await Promise.all([
    Setting.deleteMany({}),
    Group.deleteMany({}),
    SKU.deleteMany({}),
    Order.deleteMany({}),
    OrderItem.deleteMany({})
  ]);

  // Helper: map { id, ...rest } → { _id: id, ...rest }
  const normalize = (doc) => {
    const { id, ...rest } = doc;
    const normalized = { _id: id, ...rest };
    // Remove any null/undefined __v if present
    delete normalized.__v;
    return normalized;
  };

  // Insert in dependency order
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

  // Backfill orphaned orderItems (skuId is null/absent)
  const orphaned = await OrderItem.find({ skuId: null }).lean();
  for (const item of orphaned) {
    if (!item.kod) continue;
    const sku = await SKU.findOne({ kod: item.kod }).lean();
    if (sku) {
      await OrderItem.updateOne({ _id: item._id }, { skuId: sku._id });
    }
  }

  res.json({ success: true, counts: {
    settings: data.settings.length,
    groups: data.groups.length,
    skus: data.skus.length,
    orders: data.orders.length,
    orderItems: data.orderItems.length
  }});
}
```

Key requirements:
- Accepts `exportedAt` and `version` fields at top level (just ignore them).
- `id` field on each document → MongoDB `_id`.
- Handles documents with `id` at any position in the object.
- Clears ALL collections before inserting (full replace).
- Backfills `skuId` on legacy orderItems that lack it.

---

## API ROUTES: CRUD ENDPOINTS

All routes return JSON. Error responses: `{ error: "message" }`. Every route calls `dbConnect()` first.

### ID Generation Helper
```javascript
async function getNextId(Model) {
  const last = await Model.findOne().sort({ _id: -1 }).select('_id').lean();
  return (last?._id || 0) + 1;
}
```

### Response Helper (convert `_id` → `id` for all responses)
```javascript
function formatDoc(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  return obj;
}
```

### Generic Route Pattern
```javascript
import dbConnect from '../_db.js';
import { getSettingModel, getGroupModel, getSKUModel, getOrderModel, getOrderItemModel } from '../_schemas.js';

export default async function handler(req, res) {
  await dbConnect();
  try {
    switch (req.method) {
      case 'GET': /* ... */ break;
      case 'POST': /* ... */ break;
      case 'PUT': /* ... */ break;
      case 'DELETE': /* ... */ break;
      default: res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
```

### Settings

**`GET /api/settings`** — Returns `{ id: 3, minWeeks: 2, ... }`. If none exists, create defaults with `_id: 3`.

**`PUT /api/settings`** — Body: settings fields. Upserts `_id: 3`. Returns formatted doc.

### Groups

**`GET /api/groups`** — Returns `[{ id: 1, name: "...", notes: "" }]` sorted by name asc.

**`POST /api/groups`** — Body: `{ name, notes }`. Generates next `_id`. Returns formatted doc.

**`PUT /api/groups/:id`** — Updates by numeric `_id`. Returns formatted doc.

**`DELETE /api/groups/:id`** — Check for SKUs with this `groupId`. If exist, 400. Else delete, return `{ success: true }`.

### SKUs

**`GET /api/skus`** — Query: `?groupId=X`. Returns `[{ id: 57, kod: "...", ... }]`. If groupId param exists, filter by it. Sort by `_id` asc.

**`GET /api/skus/:id`** — Returns formatted single SKU.

**`POST /api/skus`** — Body: SKU fields (no `id`). Check duplicate `kod`. Generate next `_id`. Return formatted doc.

**`PUT /api/skus/:id`** — Body: fields to update. If `kod` changed, cascade to orderItems:
- `OrderItem.updateMany({ skuId: id }, { kod: newKod })`
- `OrderItem.updateMany({ skuId: null, kod: oldKod }, { kod: newKod, skuId: id })`
Return formatted doc.

**`DELETE /api/skus/:id`** — Check orderItems with this `skuId`. If exist, 400. Else delete, return `{ success: true }`.

### Orders

**`GET /api/orders`** — Returns all orders sorted by `tarikh` desc.

**`GET /api/orders/:id`** — Returns order + items: `{ ...order, items: [...] }`.

**`POST /api/orders`** — Body: `{ tarikh, namaPembuat, tempohMinggu, notes, items: [{ kod, skuId, qtyOrdered, notes }] }`. Generate order `_id` via `getNextId()`. For each item, if `skuId` not provided, look up SKU by `kod` and set it. Generate item IDs sequentially from max `_id` + 1. Return `{ success: true, id: newOrderId }`.

**`PUT /api/orders/:id`** — Body: `{ tarikh, namaPembuat, notes, items: [...] }`. Update order metadata. Delete all existing items for this order. Insert new items with new IDs. Return formatted order with `{ id, items }`.

**`DELETE /api/orders/:id`** — Delete order + all items where `orderId = id`. Return `{ success: true }`.

### Order Items

**`GET /api/order-items`** — Query: `orderId=X` (required). Returns items sorted by `_id` asc.

---

## FRONTEND: DATA ACCESS LAYER

All Dexie calls replaced with `fetch()` to API.

### API Helper
```javascript
async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  } catch (err) {
    showCustomAlert('Ralat Rangkaian', err.message);
    throw err;
  }
}
```

### CRUD Patterns

```javascript
// READ ALL
const allSkus = await apiFetch('/api/skus');
const filtered = await apiFetch('/api/skus?groupId=5');

// READ ONE
const sku = await apiFetch(`/api/skus/${id}`);

// CREATE
const created = await apiFetch('/api/skus', {
  method: 'POST',
  body: JSON.stringify({ kod: 'NEW01', nama: 'New Item', saizPek: 100 })
});

// UPDATE
const updated = await apiFetch(`/api/skus/${id}`, {
  method: 'PUT',
  body: JSON.stringify({ stokSemasa: 5000 })
});

// DELETE
await apiFetch(`/api/skus/${id}`, { method: 'DELETE' });
```

### Frontend Initialization Flow
```javascript
document.addEventListener('DOMContentLoaded', async () => {
  await loadApp();  // No startup modal
});

async function loadApp() {
  const settings = await apiFetch('/api/settings');
  appSettings = settings;
  document.getElementById('app-title-display').textContent = settings.appTitle;
  document.title = settings.appTitle;
  decorateStaticIcons();
  enhanceSearchInputs();
  initModalClosers();
  initNavigation();
  initCardTables();
  initSettingsForm();
  initGroupEvents();
  initSKUEvents();
  initOrderTableEvents();
  initCreateOrderModal();
  initEditOrderModal();
  initAddItemModal();
  initOrderReport();
  initSKUReport();
  initSyncPage();
  initDashboardSearch();
  initTableKeyboardScrolling();
  setGlobalTableHeaderTooltips();
  navigateTo('dashboard');
}
```

---

## REMAINING UI: UNCHANGED FROM ORIGINAL

### Everything That Stays EXACTLY the Same

- All 45 SVG icons and helper functions
- All CSS (custom properties, grid layout, ZK windows, card mode, responsive, print)
- All 11 page HTML structures (minus startup modal)
- All 8 modal HTML structures
- All calculations: `calculateAWU`, `roundToPackSize`, `calculateLevels`, `calculateOrderQuantity`, `determineStockStatus`, `statusLabel`
- Navigation system
- Table enhancement (column toggles, sort, search, keyboard scroll)
- Dashboard (summary cards, low-stock table)
- Help page content
- Copyright page
- Footer clock
- All Malay UI text

### Removed from HTML
- `#startup-modal` block (entire modal)
- `#save-reminder-banner` block (from header)
- Unsaved transaction counter span from footer
- Hidden file input `#startup-file-input`

### Removed from JavaScript
- `initDB()`, Dexie version management, upgrade migration
- `getSettings()` (replaced by API call)
- `transactionCounter`, `incrementCounter`, `resetCounter`, `showSaveReminder`, `hideSaveReminder`
- `importDatabase()` (replaced by `POST /api/import`)
- `exportDatabase()` (replaced by `GET /api/export`)
- `resetLocalDatabaseToEmpty()`
- `setLoadedDatabaseMeta()`, `getLoadedDatabaseMeta()`, `updateLoadedDatabaseMetaDisplay()`
- `initStartup()` and all startup modal logic

### Sync Page
The sync page now has two buttons:
- "Eksport Pangkalan Data" → fetch `/api/export` → download JSON
- "Import Pangkalan Data" → file picker → parse JSON → POST `/api/import` → reload

### Delete SKU / Delete Group
The frontend does NOT check for references locally. It calls the API, and if the API returns 400 with an error message, it shows the error to the user via `showCustomAlert`. This is simpler and guarantees the check uses the authoritative database state.

---

## EXCEL IMPORT FLOW

1. User selects `.xls/.xlsx` file.
2. Frontend reads as ArrayBuffer, parses with SheetJS (`XLSX.read()`, `sheet_to_json()`).
3. Expected columns: `'Drug / Non Drug Code'`, `'Drug / Non Drug Description'`, `'Quantity Available'`.
4. Frontend sends parsed rows to `POST /api/import-excel` as JSON: `{ filename, rows }`.
5. Backend: matches SKUs by normalized `kod` then normalized `nama`, updates `stokSemasa`, returns report.
6. Frontend displays report using `showCustomAlertHTML()`.

---

## VERIFICATION

### Data Round-Trip Test
The JSON file `substor_bulk_prabungkus_2026-06-22_09-46.json` must be importable and re-exportable without data loss:
1. Start with empty MongoDB.
2. `POST /api/import` with the JSON file.
3. `GET /api/export` → the exported JSON should have identical structure and values (order may differ).
4. All 5 arrays are present: `settings` (1), `groups` (11), `skus` (80), `orders` (4), `orderItems` (~237).
5. Every document has `id` (not `_id`).
6. All `tempohMinggu` values preserved (order 1 has none → exported as 0).
7. All order 3 items lack `skuId` in the original but should have `skuId` backfilled after import → export will now include `skuId` values.
8. All documents with `enabled: false` preserved.
9. `exportedAt` and `version` present at top level.

### Environment Variables
- `MONGODB_URI` — MongoDB Atlas connection string (set in Vercel dashboard → Settings → Environment Variables).

### Local Development
```bash
npm install
npm install -g vercel   # or npx vercel
vercel dev
```

### Deployment to Vercel
1. Push to GitHub.
2. Import in Vercel dashboard.
3. Set `MONGODB_URI` environment variable.
4. Deploy.
