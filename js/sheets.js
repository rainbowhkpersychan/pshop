// ══════════════════════════════════════════════════
//  Google Sheets + Drive API helpers
//  products: id | name | category | price | description | imageUrl | status
//  settings: key | value
// ══════════════════════════════════════════════════

const SHEET_NAME = 'products';
const SETTINGS_SHEET_NAME = 'settings';
const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE_BASE = 'https://www.googleapis.com/upload/drive/v3';

// ══════════════════════════════════════════════════
//  Per-user override storage
// ══════════════════════════════════════════════════
const MYSHOP_SHEET_KEY = 'myshop-sheet-id';
const MYSHOP_FOLDER_KEY = 'myshop-folder-id';
const MYSHOP_WA_KEY = 'myshop-whatsapp';
const MYSHOP_ALLOWED_ADMINS_KEY = 'myshop-allowed-admins';

function getStoredJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function setStoredJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function getEffectiveSheetId() {
  try {
    return localStorage.getItem(MYSHOP_SHEET_KEY) || CONFIG.SHEET_ID;
  } catch {
    return CONFIG.SHEET_ID;
  }
}

function getEffectiveFolderId() {
  try {
    return localStorage.getItem(MYSHOP_FOLDER_KEY) || CONFIG.DRIVE_FOLDER_ID;
  } catch {
    return CONFIG.DRIVE_FOLDER_ID;
  }
}

function getEffectiveWhatsApp() {
  try {
    return (localStorage.getItem(MYSHOP_WA_KEY) || CONFIG.WHATSAPP_NUMBER || '').replace(/[^0-9]/g, '');
  } catch {
    return (CONFIG.WHATSAPP_NUMBER || '').replace(/[^0-9]/g, '');
  }
}

function getAllowedAdmins() {
  return getStoredJson(MYSHOP_ALLOWED_ADMINS_KEY, [
    'ianchanpong@gmail.com',
  ]).map(v => String(v).toLowerCase().trim()).filter(Boolean);
}

function setAllowedAdmins(list) {
  setStoredJson(MYSHOP_ALLOWED_ADMINS_KEY, Array.from(new Set((list || []).map(v => String(v).toLowerCase().trim()).filter(Boolean))));
}

function isAllowedAdmin(email) {
  return getAllowedAdmins().includes(String(email || '').toLowerCase().trim());
}

function requireAllowedAdmin(email) {
  const current = String(email || '').toLowerCase().trim();
  if (!isAllowedAdmin(current)) {
    throw new Error('Not allowed');
  }
}

function setEffectiveSheetId(id) {
  try { localStorage.setItem(MYSHOP_SHEET_KEY, id); } catch {}
}

function setEffectiveFolderId(id) {
  try { localStorage.setItem(MYSHOP_FOLDER_KEY, id); } catch {}
}

function setEffectiveWhatsApp(num) {
  try { localStorage.setItem(MYSHOP_WA_KEY, (num || '').replace(/[^0-9]/g, '')); } catch {}
}

function clearMyShopOverrides() {
  try {
    localStorage.removeItem(MYSHOP_SHEET_KEY);
    localStorage.removeItem(MYSHOP_FOLDER_KEY);
    localStorage.removeItem(MYSHOP_WA_KEY);
  } catch {}
}

function getNextCategoryId() {
  return 'cat_' + Date.now() + '_' + Math.random().toString(16).slice(2, 8);
}

async function fetchSheetValues(sheetName, token, start = 'A1', end = 'Z1000') {
  const url = `${SHEETS_BASE}/${getEffectiveSheetId()}/values/${sheetName}!${start}:${end}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return res.json();
}

async function writeSheetValues(sheetName, range, values, token, method = 'PUT') {
  const url = `${SHEETS_BASE}/${getEffectiveSheetId()}/values/${sheetName}!${range}?valueInputOption=RAW`;
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ values }),
  });
  return res.ok;
}

async function clearSheetValues(sheetName, range, token) {
  const url = `${SHEETS_BASE}/${getEffectiveSheetId()}/values/${sheetName}!${range}:clear`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok;
}

// ── PRODUCTS ─────────────────────────────────────
async function fetchProducts() {
  try {
    const url = `${SHEETS_BASE}/${getEffectiveSheetId()}/values/${SHEET_NAME}!A2:G1000?key=${CONFIG.API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.values) return [];
    return data.values
      .filter(r => (r[0] || r[1] || r[3]) && r[6] !== 'off')
      .map(r => ({
        id: r[0] || '',
        name: r[1] || '',
        category: r[2] || '',
        price: r[3] || '0',
        description: r[4] || '',
        imageUrl: r[5] || '',
        status: r[6] || 'on',
      }));
  } catch (e) {
    console.error('Failed to fetch products:', e);
    return [];
  }
}

async function fetchAllProducts(token) {
  const url = `${SHEETS_BASE}/${getEffectiveSheetId()}/values/${SHEET_NAME}!A2:G1000`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!data.values) return [];
  return data.values.map((r, i) => ({
    rowIndex: i + 2,
    id: r[0] || '',
    name: r[1] || '',
    category: r[2] || '',
    price: r[3] || '0',
    description: r[4] || '',
    imageUrl: r[5] || '',
    status: r[6] || 'on',
  })).filter(p => p.id || p.name || (p.price && p.price !== '0'));
}

async function appendProduct(product, token) {
  const id = 'p_' + Date.now();
  const row = [[id, product.name, product.category, product.price, product.description, product.imageUrl, product.status]];
  const url = `${SHEETS_BASE}/${getEffectiveSheetId()}/values/${SHEET_NAME}!A:G:append?valueInputOption=RAW`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ values: row }),
  });
  return res.ok;
}

async function updateProduct(rowIndex, product, token) {
  const row = [[product.id, product.name, product.category, product.price, product.description, product.imageUrl, product.status]];
  const url = `${SHEETS_BASE}/${getEffectiveSheetId()}/values/${SHEET_NAME}!A${rowIndex}:G${rowIndex}?valueInputOption=RAW`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ values: row }),
  });
  return res.ok;
}

// Look up the numeric sheetId (gid) of a tab by its title. Cached per spreadsheet.
const _gidCache = {};
async function getSheetGid(sheetName, token) {
  const ssId = getEffectiveSheetId();
  const cacheKey = `${ssId}::${sheetName}`;
  if (_gidCache[cacheKey] != null) return _gidCache[cacheKey];
  const url = `${SHEETS_BASE}/${ssId}?fields=sheets(properties(sheetId,title))`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  const sheet = (data.sheets || []).find(s => s.properties?.title === sheetName);
  if (!sheet) throw new Error(`Sheet tab not found: ${sheetName}`);
  const gid = sheet.properties.sheetId;
  _gidCache[cacheKey] = gid;
  return gid;
}

async function deleteProduct(rowIndex, token) {
  // rowIndex is 1-based (header = row 1, first product = row 2).
  // Actually remove the row so the rows below shift up — otherwise a blank
  // row is left behind and the product appears to "come back".
  const gid = await getSheetGid(SHEET_NAME, token);
  const url = `${SHEETS_BASE}/${getEffectiveSheetId()}:batchUpdate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      requests: [{
        deleteDimension: {
          range: {
            sheetId: gid,
            dimension: 'ROWS',
            startIndex: rowIndex - 1, // 0-based, inclusive
            endIndex: rowIndex,       // exclusive
          },
        },
      }],
    }),
  });
  return res.ok;
}

// ── CATEGORIES + SITE SETTINGS (unified `settings` sheet) ──
//  settings columns: type | a | b | c
//    category row:  category | id   | name  | on/off
//    site row:      site     | key  | value |
async function fetchSettingsRaw(token) {
  try {
    const data = token
      ? await fetchSheetValues(SETTINGS_SHEET_NAME, token, 'A1', 'D1000')
      : await (await fetch(`${SHEETS_BASE}/${getEffectiveSheetId()}/values/${SETTINGS_SHEET_NAME}!A1:D1000?key=${CONFIG.API_KEY}`)).json();
    return (data.values || []).slice(1); // drop header
  } catch {
    return [];
  }
}

function parseCategories(rows) {
  return rows
    .filter(r => r[0] === 'category')
    .map(r => ({ id: r[1] || getNextCategoryId(), name: r[2] || '', enabled: r[3] !== 'off' }))
    .filter(c => c.name);
}

function parseSiteSettings(rows) {
  const out = {};
  for (const r of rows) {
    if (r[0] === 'site' && r[1]) out[r[1]] = r[2] || '';
  }
  return out;
}

// Public (front page) — uses API key, no token
async function fetchCategories() {
  return parseCategories(await fetchSettingsRaw(null));
}
async function fetchSiteSettings() {
  return parseSiteSettings(await fetchSettingsRaw(null));
}

// Admin — read both with token
async function fetchAdminSettings(token) {
  const rows = await fetchSettingsRaw(token);
  return { categories: parseCategories(rows), site: parseSiteSettings(rows) };
}

// Admin — write BOTH categories and site settings together (avoids clobbering)
async function saveAllSettings(categories, siteSettings, token) {
  const rows = [['type', 'a', 'b', 'c']];
  for (const cat of categories || []) {
    rows.push(['category', cat.id || getNextCategoryId(), cat.name || '', cat.enabled === false ? 'off' : 'on']);
  }
  for (const [key, value] of Object.entries(siteSettings || {})) {
    rows.push(['site', key, value, '']);
  }
  await clearSheetValues(SETTINGS_SHEET_NAME, 'A1:D1000', token);
  return writeSheetValues(SETTINGS_SHEET_NAME, 'A1:D' + rows.length, rows, token);
}

// ── UPLOAD IMAGE to Google Drive ─────────────────
async function uploadImageToDrive(file, token) {
  const metadata = JSON.stringify({ name: file.name, parents: [getEffectiveFolderId()] });
  const form = new FormData();
  form.append('metadata', new Blob([metadata], { type: 'application/json' }));
  form.append('file', file);
  const uploadRes = await fetch(`${DRIVE_BASE}/files?uploadType=multipart&fields=id`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const uploadData = await uploadRes.json();
  if (!uploadData.id) throw new Error('Upload failed');
  await fetch(`https://www.googleapis.com/drive/v3/files/${uploadData.id}/permissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  });
  return `https://lh3.googleusercontent.com/d/${uploadData.id}`;
}

// ── DRIVE / SHEETS SETUP ──────────────────────────
async function makeFilePublic(fileId, token) {
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  });
}

async function createSpreadsheet(title, token) {
  const createRes = await fetch(`${SHEETS_BASE}?fields=spreadsheetId`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      properties: { title: title || 'myShop Data' },
      sheets: [
        { properties: { title: SHEET_NAME } },
        { properties: { title: SETTINGS_SHEET_NAME } },
      ],
    }),
  });
  const created = await createRes.json();
  if (!created.spreadsheetId) throw new Error(created.error?.message || 'Create spreadsheet failed');
  const spreadsheetId = created.spreadsheetId;
  await writeSheetValues(SHEET_NAME, 'A1:G1', [['id', 'name', 'category', 'price', 'description', 'imageUrl', 'status']], token);
  await writeSheetValues(SETTINGS_SHEET_NAME, 'A1:D3', [
    ['type', 'a', 'b', 'c'],
    ['category', getNextCategoryId(), '精選', 'on'],
    ['category', getNextCategoryId(), '新品', 'on'],
  ], token);
  await makeFilePublic(spreadsheetId, token);
  return spreadsheetId;
}

async function createImageFolder(token, name) {
  const res = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: name || 'myShop Images',
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  const data = await res.json();
  if (!data.id) throw new Error(data.error?.message || 'Create folder failed');
  await makeFilePublic(data.id, token);
  return data.id;
}

async function setupMyShopResources(token, shopName) {
  const sheetId = await createSpreadsheet(`${shopName || 'myShop'} — Data`, token);
  const folderId = await createImageFolder(token, `${shopName || 'myShop'} — Images`);
  setEffectiveSheetId(sheetId);
  setEffectiveFolderId(folderId);
  return { sheetId, folderId };
}

window.getEffectiveSheetId = getEffectiveSheetId;
window.getEffectiveFolderId = getEffectiveFolderId;
window.getEffectiveWhatsApp = getEffectiveWhatsApp;
window.setEffectiveWhatsApp = setEffectiveWhatsApp;
window.clearMyShopOverrides = clearMyShopOverrides;
window.fetchProducts = fetchProducts;
window.fetchAllProducts = fetchAllProducts;
window.appendProduct = appendProduct;
window.updateProduct = updateProduct;
window.deleteProduct = deleteProduct;
window.uploadImageToDrive = uploadImageToDrive;
window.fetchCategories = fetchCategories;
window.fetchSiteSettings = fetchSiteSettings;
window.fetchAdminSettings = fetchAdminSettings;
window.saveAllSettings = saveAllSettings;
window.setupMyShopResources = setupMyShopResources;
window.isAllowedAdmin = isAllowedAdmin;
window.requireAllowedAdmin = requireAllowedAdmin;
window.getAllowedAdmins = getAllowedAdmins;
window.setAllowedAdmins = setAllowedAdmins;
