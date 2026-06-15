// ══════════════════════════════════════════════════
//  ⚙️  CONFIG — 只需要改呢個檔案！
// ══════════════════════════════════════════════════

const CONFIG = {

  // 1️⃣  你嘅 WhatsApp 香港號碼（852 + 8位數字，唔需要 + 或空格）
  WHATSAPP_NUMBER: '85298765432',

  // 2️⃣  Google Sheets ID
  //     從 Sheets URL 取得：
  //     https://docs.google.com/spreadsheets/d/【呢度】/edit
  //     👉 留空亦可：Admin 登入後可以一鍵建立自己嘅 Sheet。
  SHEET_ID: 'YOUR_GOOGLE_SHEET_ID',

  // 3️⃣  Google API Key（前台用，從 Google Cloud Console 取得）
  //     步驟見 SETUP.md
  API_KEY: 'YOUR_GOOGLE_API_KEY',

  // 4️⃣  Google OAuth Client ID（後台登入用）
  //     步驟見 SETUP.md（2c）
  GOOGLE_CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID',

  // 5️⃣  你嘅 Google Drive 相片資料夾 ID（可選）
  //     👉 留空亦可：Admin 登入後可以一鍵建立自己嘅資料夾。
  DRIVE_FOLDER_ID: 'YOUR_DRIVE_FOLDER_ID',

  // 6️⃣  網店名稱
  SHOP_NAME: 'myShop 精品店',

  // 7️⃣  網店副標題
  SHOP_TAGLINE: 'WhatsApp 落單 · 香港本地直送',

  // 8️⃣  頁尾版權文字（{{year}} 會自動換成今年）
  COPYRIGHT: '© {{year}} myShop 精品店. 版權所有.',

  // 9️⃣  預設語言：'zh-HK'（繁體中文）或 'en'（English）
  DEFAULT_LANG: 'zh-HK',
};
