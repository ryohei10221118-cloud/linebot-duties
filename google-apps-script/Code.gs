/**
 * LINE Bot 班表查詢系統 - Google Apps Script 版本
 *
 * 功能：
 * 1. 支援完整班表模式（複雜班別：N1/N2/M1/M2等）
 * 2. 支援簡化模式（只需設置休息日）
 * 3. 自動定時通知（早上9點通知夜班，晚上9點通知早班/中班）
 * 4. 雙公司支援，資料完全獨立
 */

// ==================== 配置區 ====================
// 👇 請填入你的 LINE Bot 資訊
const LINE_CHANNEL_ACCESS_TOKEN = 'YOUR_CHANNEL_ACCESS_TOKEN_HERE';

// 👇 請填入你的 Google Sheets ID（從網址複製）
// 格式：https://docs.google.com/spreadsheets/d/【這一段】/edit
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';

// Google Sheet 的 Tab 名稱（請勿修改，除非你改了 Sheet 的 Tab 名稱）
const SHEET_USERS = '用戶配置';
const SHEET_SCHEDULE = '完整班表';
const SHEET_GROUPS = '組別配置';
const SHEET_HOLIDAYS = '休息日記錄';

// 👇 天氣 API 設定（中央氣象署）
const WEATHER_API_KEY = 'CWA-29513A62-634B-44E0-A750-F81882868E34';
const DEFAULT_CITY = '臺北市'; // 預設縣市（如果用戶沒設定）

// 支援的縣市列表（中央氣象署 36 小時天氣預報）
const SUPPORTED_CITIES = [
  '臺北市', '新北市', '桃園市', '臺中市', '臺南市', '高雄市',
  '基隆市', '新竹市', '新竹縣', '苗栗縣', '彰化縣', '南投縣',
  '雲林縣', '嘉義市', '嘉義縣', '屏東縣', '宜蘭縣', '花蓮縣',
  '臺東縣', '澎湖縣', '金門縣', '連江縣'
];

// ==================== 配置驗證與存取輔助函數 ====================

/**
 * 安全地取得試算表，帶有自動重試機制
 * 用於處理 Google Apps Script 的間歇性服務問題
 * @param {number} maxRetries - 最大重試次數（預設 3 次）
 * @returns {Spreadsheet|null} 試算表物件，失敗則回傳 null
 */
function getSpreadsheetWithRetry(maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
      if (spreadsheet) {
        return spreadsheet;
      }
      Logger.log('⚠️ 嘗試 ' + attempt + '/' + maxRetries + '：SpreadsheetApp.openById 回傳 null');
    } catch (error) {
      Logger.log('⚠️ 嘗試 ' + attempt + '/' + maxRetries + ' 失敗：' + error.message);
    }

    // 如果不是最後一次嘗試，等待後重試（exponential backoff）
    if (attempt < maxRetries) {
      const waitTime = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
      Utilities.sleep(waitTime);
      Logger.log('等待 ' + waitTime + 'ms 後重試...');
    }
  }

  Logger.log('❌ 已嘗試 ' + maxRetries + ' 次，仍無法存取試算表');
  return null;
}

/**
 * 驗證 SPREADSHEET_ID 配置是否正確
 * @returns {Object} { valid: boolean, error: string, spreadsheet: Spreadsheet }
 */
function validateSpreadsheetConfig() {
  // 檢查是否為預設值
  if (SPREADSHEET_ID === 'YOUR_SPREADSHEET_ID_HERE' || !SPREADSHEET_ID) {
    return {
      valid: false,
      error: 'SPREADSHEET_ID 尚未設置。請在 Code.gs 第 17 行填入正確的 Google Sheets ID。'
    };
  }

  // 嘗試連接試算表（帶重試機制）
  const spreadsheet = getSpreadsheetWithRetry();
  if (!spreadsheet) {
    return {
      valid: false,
      error: '無法存取試算表（已重試 3 次）。\n可能原因：\n1. SPREADSHEET_ID 不正確\n2. 該試算表不存在\n3. 腳本執行帳號沒有存取權限\n4. Google 服務暫時性問題'
    };
  }

  return {
    valid: true,
    spreadsheet: spreadsheet
  };
}

// ==================== 診斷測試函數 ====================

/**
 * 🧪 配置診斷測試函數
 *
 * 使用方法：
 * 1. 在上方選擇函數下拉選單中選擇 "testConfiguration"
 * 2. 點擊「執行」按鈕
 * 3. 查看執行日誌（畫面下方會顯示）
 *
 * 這個函數會檢查：
 * ✓ SPREADSHEET_ID 是否正確
 * ✓ 是否能連接到 Google Sheets
 * ✓ 是否能讀取班表數據
 * ✓ LINE Channel Access Token 是否已設置
 */
function testConfiguration() {
  const results = [];

  results.push('========================================');
  results.push('🧪 LINE Bot 配置診斷測試');
  results.push('========================================');
  results.push('');

  // 測試 1: 檢查 SPREADSHEET_ID
  results.push('【測試 1】檢查 SPREADSHEET_ID');
  if (SPREADSHEET_ID === 'YOUR_SPREADSHEET_ID_HERE') {
    results.push('❌ 失敗：SPREADSHEET_ID 尚未設置');
    results.push('   請在第 17 行填入你的 Google Sheets ID');
    results.push('');
    Logger.log(results.join('\n'));
    return results.join('\n');
  }
  results.push('✓ SPREADSHEET_ID 已設置: ' + SPREADSHEET_ID);
  results.push('');

  // 測試 2: 嘗試連接 Google Sheets
  results.push('【測試 2】連接 Google Sheets');
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    results.push('✓ 成功連接到試算表');
    results.push('   試算表名稱: ' + spreadsheet.getName());
    results.push('');
  } catch (error) {
    results.push('❌ 失敗：無法連接到試算表');
    results.push('   錯誤: ' + error.message);
    results.push('   請確認：');
    results.push('   1. SPREADSHEET_ID 是否正確');
    results.push('   2. 該試算表是否存在');
    results.push('   3. 你是否有權限訪問該試算表');
    results.push('');
    Logger.log(results.join('\n'));
    return results.join('\n');
  }

  // 測試 3: 檢查必要的工作表是否存在
  results.push('【測試 3】檢查工作表結構');
  const requiredSheets = [
    { name: SHEET_USERS, desc: '用戶配置' },
    { name: SHEET_SCHEDULE, desc: '完整班表' },
    { name: SHEET_HOLIDAYS, desc: '休息日記錄' }
  ];

  let allSheetsExist = true;
  for (let sheetInfo of requiredSheets) {
    try {
      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetInfo.name);
      if (sheet) {
        results.push('✓ 找到工作表: ' + sheetInfo.name);
      } else {
        results.push('❌ 缺少工作表: ' + sheetInfo.name);
        allSheetsExist = false;
      }
    } catch (error) {
      results.push('❌ 無法檢查工作表: ' + sheetInfo.name);
      results.push('   錯誤: ' + error.message);
      allSheetsExist = false;
    }
  }
  results.push('');

  if (!allSheetsExist) {
    results.push('⚠️ 請確保試算表中有這些 Tab：');
    results.push('   - 用戶配置');
    results.push('   - 完整班表');
    results.push('   - 休息日記錄');
    results.push('');
  }

  // 測試 4: 讀取班表數據
  results.push('【測試 4】讀取班表數據');
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_SCHEDULE);
    const data = sheet.getDataRange().getValues();
    results.push('✓ 成功讀取班表');
    results.push('   資料行數: ' + data.length);
    if (data.length > 0) {
      results.push('   資料列數: ' + data[0].length);

      // 讀取員工名單
      const headers = data[0];
      const employees = [];
      for (let i = 1; i < headers.length && i <= 10; i++) {
        if (headers[i]) {
          employees.push(headers[i]);
        }
      }
      results.push('   找到員工數: ' + employees.length);
      if (employees.length > 0) {
        results.push('   前幾位員工: ' + employees.slice(0, 5).join(', '));
      }
    }
    results.push('');
  } catch (error) {
    results.push('❌ 失敗：無法讀取班表數據');
    results.push('   錯誤: ' + error.message);
    results.push('');
  }

  // 測試 5: 檢查 LINE Token
  results.push('【測試 5】檢查 LINE Channel Access Token');
  if (LINE_CHANNEL_ACCESS_TOKEN === 'YOUR_CHANNEL_ACCESS_TOKEN_HERE') {
    results.push('⚠️ 警告：LINE_CHANNEL_ACCESS_TOKEN 尚未設置');
    results.push('   請在第 13 行填入你的 LINE Channel Access Token');
    results.push('   （這不影響本地測試，但會影響 LINE Bot 功能）');
  } else {
    results.push('✓ LINE_CHANNEL_ACCESS_TOKEN 已設置');
    results.push('   Token 長度: ' + LINE_CHANNEL_ACCESS_TOKEN.length + ' 字符');
  }
  results.push('');

  // 總結
  results.push('========================================');
  results.push('📊 診斷總結');
  results.push('========================================');
  if (allSheetsExist && SPREADSHEET_ID !== 'YOUR_SPREADSHEET_ID_HERE') {
    results.push('✅ 基本配置正常！');
    results.push('');
    results.push('下一步：');
    results.push('1. 確保已填入 LINE_CHANNEL_ACCESS_TOKEN（第 13 行）');
    results.push('2. 部署為 Web 應用程式');
    results.push('3. 在 LINE Developers Console 設置 Webhook URL');
    results.push('4. 在 LINE 中測試發送：綁定 Sunny');
  } else {
    results.push('❌ 配置不完整，請根據上述錯誤進行修正');
  }
  results.push('========================================');

  const output = results.join('\n');
  Logger.log(output);
  return output;
}

/**
 * 🧪 測試綁定功能（模擬用戶綁定）
 *
 * 使用方法：
 * 1. 修改下面的 testUserName 為你的名字（例如：'Sunny'）
 * 2. 選擇 "testBindUser" 函數
 * 3. 點擊「執行」
 * 4. 查看執行日誌
 */
function testBindUser() {
  const testUserName = 'Sunny';  // 👈 修改這裡為你的名字
  const testUserId = 'TEST_USER_12345';

  Logger.log('========================================');
  Logger.log('🧪 測試綁定功能');
  Logger.log('========================================');
  Logger.log('測試用戶名稱: ' + testUserName);
  Logger.log('');

  try {
    const message = '綁定 ' + testUserName;
    const result = handleBindUser(testUserId, message);

    Logger.log('✅ 綁定功能執行完成');
    Logger.log('');
    Logger.log('回覆訊息：');
    Logger.log('---');
    Logger.log(result);
    Logger.log('---');
    Logger.log('');
    Logger.log('請檢查「用戶配置」工作表，應該會看到新增的記錄');

  } catch (error) {
    Logger.log('❌ 綁定功能執行失敗');
    Logger.log('錯誤: ' + error.message);
    Logger.log('錯誤堆疊: ' + error.stack);
  }

  Logger.log('========================================');
}

/**
 * 🔍 調試班表結構
 *
 * 使用方法：
 * 1. 選擇 "debugScheduleStructure" 函數
 * 2. 點擊「執行」
 * 3. 查看執行日誌，了解班表的實際結構
 */
function debugScheduleStructure() {
  Logger.log('========================================');
  Logger.log('🔍 調試班表結構');
  Logger.log('========================================');
  Logger.log('');

  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_SCHEDULE);
    const data = sheet.getDataRange().getValues();

    Logger.log('總行數: ' + data.length);
    Logger.log('');

    // 顯示前 10 行的前 5 列
    Logger.log('【前 10 行的數據】');
    for (let row = 0; row < Math.min(10, data.length); row++) {
      let rowData = '第 ' + (row + 1) + ' 行: ';
      for (let col = 0; col < Math.min(5, data[row].length); col++) {
        const cellValue = data[row][col];
        rowData += '[' + col + ']="' + cellValue + '" ';
      }
      Logger.log(rowData);
    }
    Logger.log('');

    // 顯示第二列（B列）的所有非空值
    Logger.log('【第二列（B列）的所有非空值】');
    for (let row = 0; row < Math.min(30, data.length); row++) {
      if (data[row][1]) {  // 第二列（index 1）
        Logger.log('第 ' + (row + 1) + ' 行, B列: "' + data[row][1] + '"');
      }
    }
    Logger.log('');

    // 測試當前的 getAllEmployees() 函數
    Logger.log('【當前 getAllEmployees() 返回的結果】');
    const employees = getAllEmployees();
    Logger.log('員工數量: ' + employees.length);
    Logger.log('員工列表: ' + JSON.stringify(employees));

  } catch (error) {
    Logger.log('❌ 調試失敗');
    Logger.log('錯誤: ' + error.message);
    Logger.log('錯誤堆疊: ' + error.stack);
  }

  Logger.log('========================================');
}

/**
 * 🔍 調試特定日期的班別讀取
 *
 * 使用方法：
 * 1. 修改下面的 testName 和 testDate
 * 2. 選擇 "debugShiftForDate" 函數
 * 3. 點擊「執行」
 * 4. 查看執行日誌
 */
function debugShiftForDate() {
  const testName = 'Sunny';  // 👈 修改為你的名字
  const testDate = new Date(2025, 10, 9);  // 👈 修改為要測試的日期（年, 月-1, 日）
  // 注意：月份從 0 開始，所以 11 月是 10

  Logger.log('========================================');
  Logger.log('🔍 調試特定日期的班別讀取');
  Logger.log('========================================');
  Logger.log('測試姓名: ' + testName);
  Logger.log('測試日期: ' + testDate.toLocaleDateString('zh-TW'));
  Logger.log('日期字串: ' + (testDate.getMonth() + 1) + '/' + testDate.getDate());
  Logger.log('');

  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_SCHEDULE);
    const data = sheet.getDataRange().getValues();

    // 1. 尋找日期列
    const dateStr = `${testDate.getMonth() + 1}/${testDate.getDate()}`;
    const headers = data[0];
    let dateCol = -1;

    Logger.log('【步驟 1：尋找日期列】');
    Logger.log('要找的日期字串: ' + dateStr);
    Logger.log('');
    Logger.log('第一行的所有值：');
    for (let col = 0; col < Math.min(20, headers.length); col++) {
      const cellValue = headers[col];
      const match = cellValue && cellValue.toString().includes(dateStr);
      Logger.log('  列 ' + col + ' (第 ' + String.fromCharCode(65 + col) + ' 列): "' + cellValue + '" ' + (match ? '✓ 匹配!' : ''));
      if (match && dateCol === -1) {
        dateCol = col;
      }
    }
    Logger.log('');
    Logger.log('找到日期在第 ' + dateCol + ' 列 (' + (dateCol >= 0 ? String.fromCharCode(65 + dateCol) + ' 列' : '未找到') + ')');
    Logger.log('');

    if (dateCol === -1) {
      Logger.log('❌ 錯誤：找不到日期 ' + dateStr);
      Logger.log('可能的原因：');
      Logger.log('1. 日期格式不符（班表中可能是 "11/9" 或 "11/09"）');
      Logger.log('2. 該日期不在班表範圍內');
      return;
    }

    // 2. 尋找員工名字行
    Logger.log('【步驟 2：尋找員工名字行】');
    let nameRow = -1;
    for (let row = 0; row < Math.min(30, data.length); row++) {
      const cellName = data[row][1];  // B 列
      if (cellName) {
        const match = cellName.toString().trim() === testName;
        Logger.log('  第 ' + (row + 1) + ' 行, B列: "' + cellName + '" ' + (match ? '✓ 匹配!' : ''));
        if (match && nameRow === -1) {
          nameRow = row;
        }
      }
    }
    Logger.log('');
    Logger.log('找到員工在第 ' + (nameRow + 1) + ' 行');
    Logger.log('');

    if (nameRow === -1) {
      Logger.log('❌ 錯誤：找不到員工 "' + testName + '"');
      return;
    }

    // 3. 讀取交叉點的班別
    Logger.log('【步驟 3：讀取班別】');
    const shift = data[nameRow][dateCol];
    Logger.log('原始班別代碼: "' + shift + '"');
    Logger.log('班別類型: ' + typeof shift);
    Logger.log('');

    const classified = classifyShift(shift);
    Logger.log('分類後的班別: "' + classified + '"');
    Logger.log('');

    // 4. 測試 getShiftForDate 函數
    Logger.log('【步驟 4：測試 getShiftForDate 函數】');
    const result = getShiftForDate(testName, testDate);
    Logger.log('getShiftForDate 返回: "' + result + '"');

  } catch (error) {
    Logger.log('❌ 調試失敗');
    Logger.log('錯誤: ' + error.message);
    Logger.log('錯誤堆疊: ' + error.stack);
  }

  Logger.log('========================================');
}

// ==================== LINE Webhook 入口 ====================

/**
 * LINE Webhook 入口函數
 * 當用戶在 LINE 發送訊息時，會觸發這個函數
 *
 * ⚠️ 注意：請不要在 Apps Script 編輯器中手動運行此函數！
 * 此函數只應該由 LINE 平台通過 Webhook 調用。
 */
function doPost(e) {
  try {
    Logger.log('========== doPost 被調用 ==========');
    Logger.log('當前時間: ' + new Date().toLocaleString('zh-TW', {timeZone: 'Asia/Taipei'}));

    // 檢查參數是否存在
    if (!e) {
      Logger.log('⚠️ 錯誤：e 參數是 undefined');
      Logger.log('這通常表示：');
      Logger.log('1. 在 Apps Script 編輯器中手動運行了此函數（請不要這樣做）');
      Logger.log('2. 或者部署配置有問題');
      Logger.log('');
      Logger.log('✅ 正確做法：');
      Logger.log('1. 確保已部署為 Web 應用程式');
      Logger.log('2. 從 LINE 發送訊息來測試');
      Logger.log('3. 不要手動運行 doPost() 函數');
      return HtmlService.createHtmlOutput();
    }

    Logger.log('✓ e 參數存在');
    Logger.log('e 的類型: ' + typeof e);
    Logger.log('e 的鍵值: ' + Object.keys(e));

    if (!e.postData) {
      Logger.log('⚠️ 錯誤：e.postData 是 undefined');
      Logger.log('e 的完整內容: ' + JSON.stringify(e));
      Logger.log('');
      Logger.log('可能的原因：');
      Logger.log('1. 這可能是 LINE 的驗證請求（GET 請求）');
      Logger.log('2. 或者 Webhook URL 配置不正確');
      return HtmlService.createHtmlOutput();
    }

    Logger.log('✓ e.postData 存在');
    Logger.log('收到 Webhook POST 請求');
    Logger.log('postData.contents: ' + e.postData.contents);

    const json = JSON.parse(e.postData.contents);
    const events = json.events;

    Logger.log('✓ JSON 解析成功');
    Logger.log('事件數量: ' + events.length);

    events.forEach((event, index) => {
      Logger.log('--- 處理事件 ' + (index + 1) + ' ---');
      Logger.log('事件類型: ' + event.type);

      if (event.type === 'message' && event.message.type === 'text') {
        Logger.log('訊息內容: ' + event.message.text);
        Logger.log('發送者 ID: ' + event.source.userId);
        handleTextMessage(event);
        Logger.log('✓ 訊息處理完成');
      } else {
        Logger.log('略過非文字訊息事件');
      }
    });

    Logger.log('========== doPost 執行完成 ==========');
    return HtmlService.createHtmlOutput();
  } catch (error) {
    Logger.log('!!! doPost 發生錯誤 !!!');
    Logger.log('錯誤類型: ' + error.name);
    Logger.log('錯誤訊息: ' + error.message);
    Logger.log('錯誤堆疊: ' + error.stack);
    Logger.log('=====================================');
    return HtmlService.createHtmlOutput();
  }
}

/**
 * 測試 Web App 是否正常運行
 * 在瀏覽器中訪問 Web App URL 時會調用這個函數
 */
function doGet() {
  Logger.log('doGet 被調用 - Web App 運行正常');
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>LINE Bot 狀態</title>
    </head>
    <body>
      <h1>✅ LINE Bot Webhook 正常運行</h1>
      <p>時間：${new Date().toLocaleString('zh-TW', {timeZone: 'Asia/Taipei'})}</p>
      <p>如果你看到這個頁面，表示 Web App 部署成功。</p>
      <p>請確認 LINE Developers Console 中的 Webhook URL 設置正確。</p>
    </body>
    </html>
  `;
  return HtmlService.createHtmlOutput(html);
}

// ==================== 訊息處理 ====================

/**
 * 處理文字訊息
 */
function handleTextMessage(event) {
  const userId = event.source.userId;
  const message = event.message.text.trim();
  const replyToken = event.replyToken;

  let replyText = '';

  // 命令路由（支持有空格或無空格）
  if (message.match(/^綁定\s*/)) {
    replyText = handleBindUser(userId, message);
  }
  else if (message.match(/^休息日\s*/)) {
    replyText = handleSetHolidays(userId, message);
  }
  else if (message.match(/^設[定]?星座\s*/)) {
    replyText = handleSetZodiac(userId, message);
  }
  else if (message.match(/^設[定]?縣市\s*/)) {
    replyText = handleSetCity(userId, message);
  }
  else if (message.match(/^查[詢询]\s*/)) {
    replyText = handleCheckSpecificDate(userId, message);
  }
  else if (message === '今天上班嗎' || message === '今天上班吗') {
    replyText = handleCheckToday(userId);
  }
  else if (message === '明天上班嗎' || message === '明天上班吗') {
    replyText = handleCheckTomorrow(userId);
  }
  else if (message === '本週班表' || message === '本周班表') {
    replyText = handleCheckWeek(userId);
  }
  else if (message === '同班人員' || message === '同班人员') {
    replyText = handleCheckCoworkers(userId);
  }
  else if (message === '本月休假日') {
    replyText = handleCheckMonthHolidays(userId);
  }
  else if (message === '幫助' || message === '帮助' || message === 'help') {
    replyText = getHelpMessage();
  }
  else {
    replyText = '不好意思，我不太懂這個命令。\n輸入「幫助」查看可用命令。';
  }

  // 回覆訊息
  replyMessage(replyToken, replyText);
}

/**
 * 綁定用戶
 * 格式：綁定 姓名 或 綁定姓名（無空格也可）
 * 系統會自動檢查是否在完整班表中，來決定使用哪種模式
 */
function handleBindUser(userId, message) {
  try {
    // 解析綁定訊息：綁定 姓名 [縣市] [星座]
    const parts = message.replace(/^綁定\s*/, '').trim().split(/\s+/);
    const name = parts[0];
    let city = DEFAULT_CITY;
    let zodiac = '';

    // 解析縣市和星座（可以是任意順序）
    for (let i = 1; i < parts.length; i++) {
      if (SUPPORTED_CITIES.includes(parts[i])) {
        city = parts[i];
      } else if (ZODIAC_SIGNS.includes(parts[i])) {
        zodiac = parts[i];
      }
    }

    // 檢查是否在完整班表中
    const allEmployees = getAllEmployees();
    const isInSchedule = allEmployees.includes(name);

    // 自動判斷模式
    const mode = isInSchedule ? '完整' : '簡化';

    const spreadsheet = getSpreadsheetWithRetry();
    if (!spreadsheet) {
      return '❌ 系統暫時無法存取資料，請稍後再試。';
    }

    const sheet = spreadsheet.getSheetByName(SHEET_USERS);
    if (!sheet) {
      return '❌ 系統配置錯誤，請聯絡管理員。';
    }

  // 檢查是否已經綁定
  const data = sheet.getDataRange().getValues();
  let found = false;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      // 更新現有記錄（包含縣市和星座）
      sheet.getRange(i + 1, 2, 1, 5).setValues([[name, mode, '', city, zodiac]]);
      found = true;
      break;
    }
  }

  if (!found) {
    // 新增記錄（包含縣市和星座）
    sheet.appendRow([userId, name, mode, '', city, zodiac]);
  }

  let reply = `✅ 綁定成功！\n\n`;
  reply += `👤 姓名：${name}\n`;
  reply += `📊 模式：${mode}模式\n`;
  reply += `🌍 縣市：${city}\n`;
  if (zodiac) {
    reply += `✨ 星座：${zodiac}\n`;
  }

  if (mode === '完整') {
    reply += `\n你可以使用以下命令：\n`;
    reply += `• 明天上班嗎\n`;
    reply += `• 今天上班嗎\n`;
    reply += `• 本週班表\n`;
    reply += `• 同班人員\n`;
    reply += `• 設定縣市 [縣市名稱]\n`;
    if (!zodiac) {
      reply += `• 設定星座 [星座名稱]\n`;
    }
  } else {
    reply += `\n`;
    reply += `請設置你的休息日：\n`;
    reply += `例如：休息日 11/3,11/10,11/17\n\n`;
    reply += `你也可以修改縣市：設定縣市 新北市\n`;
    if (!zodiac) {
      reply += `或設定星座：設定星座 天秤座\n`;
    }
    reply += `\n設置後系統會每天自動提醒你！`;
  }

    return reply;
  } catch (error) {
    Logger.log('❌ handleBindUser 發生錯誤：' + error.message);
    return '❌ 綁定失敗，系統暫時無法處理，請稍後再試。';
  }
}

/**
 * 設置休息日（簡化模式）
 * 格式：休息日 11/3,11/10,11/17,11/24
 */
function handleSetHolidays(userId, message) {
  const user = getUserInfo(userId);
  if (!user) {
    return '❌ 請先綁定身份！\n例如：綁定 John';
  }

  if (user.mode !== '簡化') {
    return '❌ 你使用的是完整模式，不需要設置休息日。';
  }

  // 解析休息日（支持有空格或無空格）
  const dateStr = message.replace(/^休息日\s*/, '').trim();
  const dates = dateStr.split(',').map(d => d.trim());

  // 轉換為完整日期格式
  const year = new Date().getFullYear();
  const fullDates = dates.map(d => {
    const [month, day] = d.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  });

  // 儲存到 Sheet
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_HOLIDAYS);
  const data = sheet.getDataRange().getValues();

  let found = false;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === user.name) {
      // 更新現有記錄
      sheet.getRange(i + 1, 2).setValue(fullDates.join(','));
      found = true;
      break;
    }
  }

  if (!found) {
    sheet.appendRow([user.name, fullDates.join(',')]);
  }

  // 生成回覆
  let reply = `✅ 已設置休息日：\n\n`;
  dates.forEach(d => {
    reply += `📅 ${d}\n`;
  });
  reply += `\n系統會在每天自動提醒你！`;

  return reply;
}

/**
 * 設定星座
 * 格式：設定星座 天秤座
 */
function handleSetZodiac(userId, message) {
  const user = getUserInfo(userId);
  if (!user) {
    return '❌ 請先綁定身份！\n例如：綁定 Sunny';
  }

  // 解析星座（支持有空格或無空格）
  const zodiac = message.replace(/^設[定]?星座\s*/, '').trim();

  // 驗證星座是否支援
  if (!ZODIAC_SIGNS.includes(zodiac)) {
    return `❌ 不支援的星座「${zodiac}」\n\n✅ 支援的星座：\n${ZODIAC_SIGNS.join('、')}`;
  }

  // 更新用戶星座
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_USERS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      // 更新第 6 列（F 列，index 5）的星座
      sheet.getRange(i + 1, 6).setValue(zodiac);
      return `✅ 已更新星座設定：${zodiac}\n\n之後的通知將包含${zodiac}的每日運勢！`;
    }
  }

  return '❌ 找不到用戶資料，請重新綁定。';
}

/**
 * 設定縣市
 * 格式：設定縣市 臺北市
 */
function handleSetCity(userId, message) {
  const user = getUserInfo(userId);
  if (!user) {
    return '❌ 請先綁定身份！\n例如：綁定 Sunny';
  }

  // 解析縣市（支持有空格或無空格）
  const city = message.replace(/^設[定]?縣市\s*/, '').trim();

  // 驗證縣市是否支援
  if (!SUPPORTED_CITIES.includes(city)) {
    return `❌ 不支援的縣市「${city}」\n\n✅ 支援的縣市：\n${SUPPORTED_CITIES.join('、')}`;
  }

  // 更新用戶縣市
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_USERS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      // 更新第 5 列（E 列，index 4）的縣市
      sheet.getRange(i + 1, 5).setValue(city);
      return `✅ 已更新縣市設定：${city}\n\n之後的天氣預報將顯示${city}的天氣！`;
    }
  }

  return '❌ 找不到用戶資料，請重新綁定。';
}

/**
 * 查詢今天是否上班
 */
function handleCheckToday(userId) {
  const user = getUserInfo(userId);
  if (!user) {
    return '❌ 請先綁定身份！\n例如：綁定 Sunny';
  }

  const today = new Date();

  if (user.mode === '簡化') {
    const result = checkSimpleMode(user, today);
    // 將 "明天" 替換為 "今天"
    return result.replace(/明天 \d{1,2}\/\d{1,2} \([一二三四五六日]\)/, '今天');
  } else {
    const result = checkFullMode(user, today);
    // 將 "明天" 替換為 "今天"
    return result.replace(/明天 \d{1,2}\/\d{1,2} \([一二三四五六日]\)/, '今天');
  }
}

/**
 * 查詢明天是否上班
 */
function handleCheckTomorrow(userId) {
  const user = getUserInfo(userId);
  if (!user) {
    return '❌ 請先綁定身份！\n例如：綁定 Sunny';
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (user.mode === '簡化') {
    return checkSimpleMode(user, tomorrow);
  } else {
    return checkFullMode(user, tomorrow);
  }
}

/**
 * 查詢特定日期的班別
 * 格式：查詢 11/9 或 查詢 11/09
 */
function handleCheckSpecificDate(userId, message) {
  const user = getUserInfo(userId);
  if (!user) {
    return '❌ 請先綁定身份！\n例如：綁定 Sunny';
  }

  // 從訊息中提取日期（支持有空格或無空格）
  const dateStr = message.replace(/^查[詢询]\s*/, '').trim();

  // 解析日期格式：MM/DD 或 M/D
  const dateMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!dateMatch) {
    return '❌ 日期格式錯誤！\n\n請使用以下格式：\n查詢 11/9\n查詢 12/25';
  }

  const month = parseInt(dateMatch[1]);
  const day = parseInt(dateMatch[2]);

  // 驗證月份和日期
  if (month < 1 || month > 12) {
    return '❌ 月份必須在 1-12 之間';
  }
  if (day < 1 || day > 31) {
    return '❌ 日期必須在 1-31 之間';
  }

  // 建立日期物件（使用當前年份）
  const currentYear = new Date().getFullYear();
  const queryDate = new Date(currentYear, month - 1, day);

  // 檢查日期是否有效（例如 2 月 30 日會無效）
  if (queryDate.getMonth() !== month - 1) {
    return '❌ 無效的日期！';
  }

  // 格式化日期顯示
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const dateDisplay = `${month}月${day}日 (${weekdays[queryDate.getDay()]})`;

  // 查詢班別
  if (user.mode === '簡化') {
    const result = checkSimpleMode(user, queryDate);
    // 將 "明天 MM/DD (X)" 替換為 "MM月DD日 (X)"
    return result.replace(/明天 \d{1,2}\/\d{1,2} \([一二三四五六日]\)/, dateDisplay);
  } else {
    const result = checkFullMode(user, queryDate);
    // 將 "明天 MM/DD (X)" 替換為 "MM月DD日 (X)"
    return result.replace(/明天 \d{1,2}\/\d{1,2} \([一二三四五六日]\)/, dateDisplay);
  }
}

/**
 * 查詢本週班表
 */
function handleCheckWeek(userId) {
  const user = getUserInfo(userId);
  if (!user) {
    return '❌ 請先綁定身份！';
  }

  if (user.mode === '簡化') {
    return '簡化模式不支援本週班表查詢。\n可以查看「本月休假日」。';
  }

  // 獲取本週日期範圍
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  let reply = `📅 ${user.name} 的本週班表\n`;
  reply += `════════════════\n\n`;

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const shift = getShiftForDate(user.name, date);
    const dayName = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];

    reply += `${date.getMonth() + 1}/${date.getDate()} (${dayName}) ${shift}\n`;
  }

  return reply;
}

/**
 * 查詢明天同班人員
 */
function handleCheckCoworkers(userId) {
  const user = getUserInfo(userId);
  if (!user) {
    return '❌ 請先綁定身份！';
  }

  if (user.mode === '簡化') {
    return '簡化模式不支援同班人員查詢。';
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const myShift = getShiftForDate(user.name, tomorrow);
  if (!myShift || myShift.includes('休息') || myShift.includes('休假')) {
    return '明天你休息，沒有同班人員。';
  }

  // 判斷我的班別類型
  let myShiftType = '';
  if (myShift.includes('夜班')) myShiftType = '夜班';
  else if (myShift.includes('早班')) myShiftType = '早班';
  else if (myShift.includes('中班')) myShiftType = '中班';
  else return '無法判斷班別類型';

  // 獲取所有人的名單
  const allEmployees = getAllEmployees();
  const coworkers = [];

  // 檢查所有人明天的班別
  allEmployees.forEach(employee => {
    if (employee !== user.name) {
      const shift = getShiftForDate(employee, tomorrow);
      if (shift && shift.includes(myShiftType)) {
        coworkers.push(`${employee} (${shift})`);
      }
    }
  });

  if (coworkers.length === 0) {
    return `明天只有你一個人上${myShiftType}。`;
  }

  let reply = `👥 明天同班人員 (${myShiftType})：\n\n`;
  coworkers.forEach(c => reply += `• ${c}\n`);

  return reply;
}

/**
 * 查詢本月休假日
 */
function handleCheckMonthHolidays(userId) {
  const user = getUserInfo(userId);
  if (!user) {
    return '❌ 請先綁定身份！';
  }

  if (user.mode !== '簡化') {
    return '完整模式不支援此命令。';
  }

  const holidays = getUserHolidays(user.name);
  if (holidays.length === 0) {
    return '你還沒有設置休假日。\n例如：休假日 11/3,11/10,11/17';
  }

  const today = new Date();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  let reply = `📅 你的休息日：\n\n`;

  holidays.forEach(h => {
    const hDate = new Date(h);
    const isPast = hDate < today;
    const emoji = isPast ? '✅' : '⏰';
    const weekday = weekdays[hDate.getDay()];

    reply += `${emoji} ${hDate.getMonth() + 1}/${hDate.getDate()} (週${weekday})`;
    if (!isPast) {
      const daysLeft = Math.ceil((hDate - today) / (1000 * 60 * 60 * 24));
      reply += ` - 還有${daysLeft}天`;
    } else {
      reply += ` - 已過`;
    }
    reply += '\n';
  });

  return reply;
}

// ==================== 輔助函數 ====================

/**
 * 獲取用戶資訊
 */
function getUserInfo(userId) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_USERS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      return {
        userId: data[i][0],
        name: data[i][1],
        mode: data[i][2],
        group: data[i][3],
        city: data[i][4] || DEFAULT_CITY, // 如果沒設定，使用預設縣市
        zodiac: data[i][5] || '' // 星座（第6列，F列）
      };
    }
  }
  return null;
}

/**
 * 獲取用戶休息日列表
 */
function getUserHolidays(name) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_HOLIDAYS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === name) {
      const dateStr = data[i][1];
      if (dateStr) {
        return dateStr.split(',').map(d => d.trim());
      }
    }
  }
  return [];
}

/**
 * 判斷用戶的主要班別類型（夜班/早班/中班）
 * 通過檢查本月前後幾天的班別來判斷
 */
function getUserShiftType(name, date) {
  try {
    const spreadsheet = getSpreadsheetWithRetry();
    if (!spreadsheet) {
      return null;
    }

    const sheet = spreadsheet.getSheetByName(SHEET_SCHEDULE);
    if (!sheet) {
      return null;
    }

    const data = sheet.getDataRange().getValues();
    if (data.length === 0) return null;

    // 找到員工的行
    let nameRow = -1;
    for (let row = 2; row < data.length; row++) {
      const cellName = data[row][1];
      if (cellName && cellName.toString().trim() === name) {
        nameRow = row;
        break;
      }
    }

    if (nameRow === -1) return null;

    // 檢查本月所有日期的班別（取前後15天的範圍）
    const nightShiftCount = 0;
    const morningShiftCount = 0;
    const afternoonShiftCount = 0;

    let nightCount = 0;
    let morningCount = 0;
    let afternoonCount = 0;

    // 檢查這一行所有的班別代碼
    for (let col = 2; col < data[nameRow].length; col++) {
      const shiftCode = data[nameRow][col];
      if (shiftCode && typeof shiftCode === 'string') {
        const code = shiftCode.toString().trim().toUpperCase();
        if (code.startsWith('N')) nightCount++;
        else if (code.startsWith('M')) morningCount++;
        else if (code.startsWith('A')) afternoonCount++;
      }
    }

    // 返回最多的班別類型
    if (nightCount > 0 && nightCount >= morningCount && nightCount >= afternoonCount) {
      return '夜班';
    } else if (morningCount > 0 && morningCount >= afternoonCount) {
      return '早班';
    } else if (afternoonCount > 0) {
      return '中班';
    }

    return null;
  } catch (error) {
    Logger.log('❌ getUserShiftType 發生錯誤：' + error.message);
    return null;
  }
}

/**
 * 查詢指定日期的班別
 */
function getShiftForDate(name, date) {
  try {
    const spreadsheet = getSpreadsheetWithRetry();
    if (!spreadsheet) {
      Logger.log('❌ getShiftForDate: 無法存取試算表');
      return '';
    }

    const sheet = spreadsheet.getSheetByName(SHEET_SCHEDULE);
    if (!sheet) {
      Logger.log('❌ getShiftForDate: 找不到工作表 ' + SHEET_SCHEDULE);
      return '';
    }

    const data = sheet.getDataRange().getValues();

  if (data.length === 0) return '';

  // 1. 從第一行找到日期對應的列
  const headers = data[0];  // 第一行是日期
  let dateCol = -1;

  const targetMonth = date.getMonth();  // 0-11
  const targetDate = date.getDate();    // 1-31

  Logger.log('🔍 尋找日期：' + (targetMonth + 1) + '/' + targetDate);

  for (let col = 2; col < headers.length; col++) {  // 從 C 列開始（index 2）
    const cellValue = headers[col];

    // 檢查是否為 Date 物件
    if (cellValue instanceof Date) {
      if (cellValue.getMonth() === targetMonth && cellValue.getDate() === targetDate) {
        Logger.log('✓ 找到日期在列 ' + col + ' (Date 物件)');
        dateCol = col;
        break;
      }
    }
    // 也檢查字串格式的日期（例如 "11/10" 或 "11/9"）
    else if (cellValue && typeof cellValue === 'string') {
      const dateMatch = cellValue.match(/^(\d{1,2})\/(\d{1,2})$/);
      if (dateMatch) {
        const month = parseInt(dateMatch[1]);
        const day = parseInt(dateMatch[2]);
        if (month === targetMonth + 1 && day === targetDate) {
          Logger.log('✓ 找到日期在列 ' + col + ' (字串格式: ' + cellValue + ')');
          dateCol = col;
          break;
        }
      }
    }
  }

  if (dateCol === -1) {
    Logger.log('❌ 找不到日期列');
    return '';
  }

  // 2. 從 B 列找到員工姓名對應的行
  let nameRow = -1;
  for (let row = 2; row < data.length; row++) {  // 從第 3 行開始（跳過標題）
    const cellName = data[row][1];  // B 列（index 1）
    if (cellName && cellName.toString().trim() === name) {
      Logger.log('✓ 找到員工 ' + name + ' 在第 ' + (row + 1) + ' 行');
      nameRow = row;
      break;
    }
  }

  if (nameRow === -1) {
    Logger.log('❌ 找不到員工：' + name);
    return '';
  }

    // 3. 返回該員工在該日期的班別
    const shift = data[nameRow][dateCol];
    const classified = shift ? classifyShift(shift) : '';
    Logger.log('📅 ' + name + ' 的班別：原始=' + shift + ', 分類=' + classified);
    return classified;
  } catch (error) {
    Logger.log('❌ getShiftForDate 發生錯誤：' + error.message);
    return '';
  }
}

/**
 * 獲取組員列表
 */
function getGroupMembers(groupName) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_GROUPS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === groupName) {
      const membersStr = data[i][1];
      if (membersStr) {
        return membersStr.split(',').map(m => m.trim());
      }
    }
  }
  return [];
}

/**
 * 獲取所有員工名單
 * 從完整班表的 B 列（第二列）讀取所有員工姓名
 */
function getAllEmployees() {
  // 檢查 SPREADSHEET_ID 是否已設置
  if (!SPREADSHEET_ID || SPREADSHEET_ID === 'YOUR_SPREADSHEET_ID_HERE') {
    Logger.log('❌ 錯誤：SPREADSHEET_ID 尚未設置');
    Logger.log('請在 Code.gs 的第 17 行填入你的 Google Sheets ID');
    Logger.log('');
    Logger.log('如何找到 Spreadsheet ID：');
    Logger.log('1. 打開你的 Google Sheets');
    Logger.log('2. 從網址複製 ID：');
    Logger.log('   https://docs.google.com/spreadsheets/d/【這一段就是ID】/edit');
    Logger.log('3. 貼到 Code.gs 第 17 行：');
    Logger.log('   const SPREADSHEET_ID = "你的ID";');
    throw new Error('❌ SPREADSHEET_ID 尚未設置。請在第 17 行填入你的 Google Sheets ID。');
  }

  try {
    const spreadsheet = getSpreadsheetWithRetry();
    if (!spreadsheet) {
      Logger.log('❌ 錯誤：無法存取試算表（已重試 3 次）');
      throw new Error('無法存取試算表');
    }

    const sheet = spreadsheet.getSheetByName(SHEET_SCHEDULE);
    if (!sheet) {
      Logger.log('❌ 錯誤：找不到工作表 "' + SHEET_SCHEDULE + '"');
      Logger.log('請確認你的 Google Sheets 中有一個名為 "完整班表" 的工作表');
      throw new Error('找不到工作表：' + SHEET_SCHEDULE);
    }

    const data = sheet.getDataRange().getValues();

    if (data.length === 0) return [];

    const employees = [];

    // 員工姓名在 B 列（index 1），從第 3 行開始（跳過前兩行的標題）
    for (let row = 2; row < data.length; row++) {
      const name = data[row][1];  // B 列（第二列，index 1）

      // 只收集非空的值，且排除可能的標題文字
      if (name &&
          typeof name === 'string' &&
          name.trim() !== '' &&
          name !== 'Long Holiday' &&
          name !== 'Head' &&
          !name.includes('限休人數') &&
          !name.includes('已休人數')) {

        const trimmedName = name.trim();
        // 避免重複添加
        if (!employees.includes(trimmedName)) {
          employees.push(trimmedName);
        }
      }
    }

    return employees;
  } catch (error) {
    Logger.log('❌ getAllEmployees 錯誤：' + error.message);
    Logger.log('錯誤堆疊：' + error.stack);
    Logger.log('');
    Logger.log('可能的原因：');
    Logger.log('1. SPREADSHEET_ID 格式錯誤');
    Logger.log('2. 沒有權限訪問該試算表');
    Logger.log('3. 試算表不存在');
    throw error;
  }
}

/**
 * 查詢天氣預報（中央氣象署 API）
 * @param {string} city - 縣市名稱（例如：臺北市、新北市）
 * @param {Date} date - 查詢日期
 * @returns {string} 天氣資訊文字，格式：「🌤️ 臺北市天氣預報\n多雲時晴 23-28°C 降雨 20%」
 */
function getWeatherForecast(city, date) {
  try {
    // 檢查縣市參數
    if (!city || typeof city !== 'string' || city.trim() === '') {
      Logger.log('⚠️ 天氣查詢：縣市參數無效 - ' + city);
      city = DEFAULT_CITY; // 使用預設縣市
      Logger.log('使用預設縣市：' + DEFAULT_CITY);
    }

    Logger.log('🌤️ 查詢天氣：' + city + ' 日期：' + date.toLocaleDateString('zh-TW'));

    // 中央氣象署 36 小時天氣預報 API
    const apiUrl = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001?Authorization=${WEATHER_API_KEY}&locationName=${encodeURIComponent(city)}`;

    const response = UrlFetchApp.fetch(apiUrl);
    const data = JSON.parse(response.getContentText());

    // 檢查 API 回應是否成功（注意：success 是字串 "true"，不是布林值）
    if (data.success !== 'true' && data.success !== true) {
      Logger.log('⚠️ 天氣 API 失敗 - success: ' + data.success);
      return '';
    }

    // 檢查是否有資料
    if (!data.records || !data.records.location || data.records.location.length === 0) {
      Logger.log('⚠️ 天氣 API 找不到縣市「' + city + '」的資料');
      Logger.log('API 回應: ' + JSON.stringify(data));
      return ''; // 靜默失敗，不顯示天氣
    }

    const location = data.records.location[0];
    const weatherElements = location.weatherElement;

    if (!weatherElements || weatherElements.length === 0) {
      Logger.log('⚠️ 天氣 API 沒有天氣要素資料');
      return '';
    }

    // 查找與指定日期匹配的時段
    // 中央氣象署 API 返回多個時段，需要找到包含查詢日期的時段
    let wx = ''; // 天氣現象
    let minT = ''; // 最低溫
    let maxT = ''; // 最高溫
    let pop = ''; // 降雨機率

    // 設定查詢日期的範圍（當天的開始和結束）
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    for (let element of weatherElements) {
      const elementName = element.elementName;

      // 遍歷所有時段，找到包含查詢日期的時段
      let selectedTimeData = null;

      if (element.time && element.time.length > 0) {
        for (let timeData of element.time) {
          if (timeData.startTime && timeData.endTime) {
            const startTime = new Date(timeData.startTime);
            const endTime = new Date(timeData.endTime);

            // 檢查查詢日期是否在此時段範圍內
            // 或者時段的開始時間在查詢日期當天
            if ((startTime >= targetDate && startTime < nextDay) ||
                (endTime > targetDate && endTime <= nextDay) ||
                (startTime <= targetDate && endTime >= nextDay)) {
              selectedTimeData = timeData;
              break;
            }
          }
        }

        // 如果沒有找到匹配的時段，使用第一個時段（默認行為）
        if (!selectedTimeData && element.time.length > 0) {
          selectedTimeData = element.time[0];
        }
      }

      if (!selectedTimeData || !selectedTimeData.parameter) continue;

      if (elementName === 'Wx') {
        wx = selectedTimeData.parameter.parameterName;
      } else if (elementName === 'MinT') {
        minT = selectedTimeData.parameter.parameterName;
      } else if (elementName === 'MaxT') {
        maxT = selectedTimeData.parameter.parameterName;
      } else if (elementName === 'PoP') {
        pop = selectedTimeData.parameter.parameterName;
      }
    }

    // 檢查是否成功取得所有必要資訊
    if (!wx || !minT || !maxT || !pop) {
      Logger.log('⚠️ 天氣資訊不完整 - wx:' + wx + ' minT:' + minT + ' maxT:' + maxT + ' pop:' + pop);
      return '';
    }

    // 根據天氣現象選擇 emoji
    let weatherEmoji = '🌤️';
    if (wx.includes('雨')) weatherEmoji = '🌧️';
    else if (wx.includes('雲')) weatherEmoji = '☁️';
    else if (wx.includes('晴')) weatherEmoji = '☀️';
    else if (wx.includes('陰')) weatherEmoji = '🌥️';
    else if (wx.includes('雷')) weatherEmoji = '⛈️';

    // 組合天氣資訊（加入城市名稱）
    let weatherInfo = `\n\n${weatherEmoji} ${city}天氣預報\n`;
    weatherInfo += `${wx} ${minT}-${maxT}°C\n`;
    weatherInfo += `降雨機率 ${pop}%`;

    Logger.log('✓ 天氣查詢成功：' + city + ' - ' + wx);
    return weatherInfo;

  } catch (error) {
    Logger.log('❌ 天氣查詢失敗：' + error.message);
    Logger.log('錯誤堆疊：' + error.stack);
    return ''; // 靜默失敗，不顯示天氣
  }
}

/**
 * 支援的星座列表
 */
const ZODIAC_SIGNS = [
  '白羊座', '金牛座', '雙子座', '巨蟹座', '獅子座', '處女座',
  '天秤座', '天蠍座', '射手座', '摩羯座', '水瓶座', '雙魚座'
];

/**
 * 中文星座對應英文星座
 */
const ZODIAC_MAPPING = {
  '白羊座': 'aries',
  '金牛座': 'taurus',
  '雙子座': 'gemini',
  '巨蟹座': 'cancer',
  '獅子座': 'leo',
  '處女座': 'virgo',
  '天秤座': 'libra',
  '天蠍座': 'scorpio',
  '射手座': 'sagittarius',
  '摩羯座': 'capricorn',
  '水瓶座': 'aquarius',
  '雙魚座': 'pisces'
};

/**
 * 獲取每日星座運勢（使用 Aztro API + Google 翻譯）
 * @param {string} zodiac - 星座名稱（繁體中文）
 * @param {Date} date - 查詢日期
 * @returns {string} 星座運勢文字
 */
function getZodiacFortune(zodiac, date) {
  try {
    if (!zodiac || !ZODIAC_SIGNS.includes(zodiac)) {
      return '';
    }

    // 先嘗試使用 Aztro API
    const apiResult = getZodiacFortuneFromAPI(zodiac, date);
    if (apiResult) {
      return apiResult;
    }

    // API 失敗時，使用自建運勢系統作為備用
    Logger.log('⚠️ Aztro API 失敗，使用自建運勢系統');
    return getZodiacFortuneFallback(zodiac, date);

  } catch (error) {
    Logger.log('❌ 星座運勢查詢失敗：' + error.message);
    // 發生錯誤時使用自建系統
    return getZodiacFortuneFallback(zodiac, date);
  }
}

/**
 * 從 Aztro API 獲取星座運勢
 * @param {string} zodiac - 星座名稱（繁體中文）
 * @param {Date} date - 查詢日期
 * @returns {string} 星座運勢文字或空字串
 */
function getZodiacFortuneFromAPI(zodiac, date) {
  try {
    // 轉換中文星座為英文
    const englishSign = ZODIAC_MAPPING[zodiac];
    if (!englishSign) {
      Logger.log('⚠️ 無法找到星座對應：' + zodiac);
      return '';
    }

    // 判斷查詢哪一天（today, tomorrow, yesterday）
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    let day = 'today';
    const diffDays = Math.round((targetDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      day = 'today';
    } else if (diffDays === 1) {
      day = 'tomorrow';
    } else if (diffDays === -1) {
      day = 'yesterday';
    } else {
      // Aztro API 只支持今天、明天、昨天，其他日期使用 today
      day = 'today';
    }

    Logger.log('🌟 調用 Aztro API：' + englishSign + ' / ' + day);

    // 調用 Aztro API
    const url = `https://aztro.sameerkumar.website/?sign=${englishSign}&day=${day}`;
    const options = {
      method: 'post',
      muteHttpExceptions: true,
      validateHttpsCertificates: false
    };

    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();

    if (statusCode !== 200) {
      Logger.log('⚠️ Aztro API 返回錯誤：' + statusCode);
      return '';
    }

    const data = JSON.parse(response.getContentText());

    // 提取運勢資訊
    const description = data.description || '';
    const mood = data.mood || '';
    const color = data.color || '';
    const luckyNumber = data.lucky_number || '';
    const luckyTime = data.lucky_time || '';

    if (!description) {
      Logger.log('⚠️ Aztro API 返回空內容');
      return '';
    }

    // 使用 Google 翻譯將英文翻譯成繁體中文
    const translatedDescription = LanguageApp.translate(description, 'en', 'zh-TW');
    const translatedMood = mood ? LanguageApp.translate(mood, 'en', 'zh-TW') : '';
    const translatedColor = color ? LanguageApp.translate(color, 'en', 'zh-TW') : '';

    // 組合運勢訊息
    let fortune = `\n\n✨ ${zodiac}運勢\n`;
    fortune += `${translatedDescription}\n\n`;

    if (translatedMood) {
      fortune += `💭 今日心情：${translatedMood}\n`;
    }

    if (translatedColor && luckyNumber) {
      fortune += `🍀 幸運色：${translatedColor} | 幸運數字：${luckyNumber}`;
    } else if (translatedColor) {
      fortune += `🍀 幸運色：${translatedColor}`;
    } else if (luckyNumber) {
      fortune += `🍀 幸運數字：${luckyNumber}`;
    }

    Logger.log('✓ Aztro API 星座運勢查詢成功：' + zodiac);
    return fortune;

  } catch (error) {
    Logger.log('❌ Aztro API 調用失敗：' + error.message);
    return '';
  }
}

/**
 * 自建星座運勢系統（備用方案）
 * @param {string} zodiac - 星座名稱
 * @param {Date} date - 查詢日期
 * @returns {string} 星座運勢文字
 */
function getZodiacFortuneFallback(zodiac, date) {
  try {
    // 使用日期作為隨機種子，確保同一天同一星座的運勢相同
    const dateStr = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
    const seed = zodiac.charCodeAt(0) + dateStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    // 簡單的偽隨機數生成器
    const random = (max) => {
      const x = Math.sin(seed + max) * 10000;
      return Math.floor((x - Math.floor(x)) * max);
    };

    // 運勢評分（1-5星）
    const luckScore = (random(5) % 5) + 1;
    const stars = '⭐'.repeat(luckScore);

    // 運勢關鍵詞
    const luckKeywords = [
      ['順遂', '平穩', '需謹慎', '挑戰', '轉機'],
      ['活力充沛', '平和安穩', '需要休息', '精力旺盛', '心情愉悅'],
      ['貴人相助', '獨立自主', '團隊合作', '適合社交', '宜獨處思考']
    ];

    const keyword1 = luckKeywords[0][random(luckKeywords[0].length)];
    const keyword2 = luckKeywords[1][random(luckKeywords[1].length)];
    const keyword3 = luckKeywords[2][random(luckKeywords[2].length)];

    // 幸運色
    const luckyColors = ['紅色', '藍色', '綠色', '黃色', '紫色', '粉色', '白色', '黑色', '橙色'];
    const luckyColor = luckyColors[random(luckyColors.length)];

    // 幸運數字
    const luckyNumber = (random(99) % 99) + 1;

    // 每日建議
    const advices = [
      '保持積極樂觀的心態',
      '多與他人溝通交流',
      '注意身體健康',
      '適當放鬆心情',
      '把握當下機會',
      '謹慎處理細節',
      '相信自己的直覺',
      '多關心身邊的人',
      '學習新事物',
      '整理思緒規劃未來'
    ];
    const advice = advices[random(advices.length)];

    // 組合運勢訊息
    let fortune = `\n\n✨ ${zodiac}運勢 ${stars}\n`;
    fortune += `整體運勢：${keyword1}\n`;
    fortune += `能量狀態：${keyword2}\n`;
    fortune += `人際關係：${keyword3}\n`;
    fortune += `幸運色：${luckyColor} | 幸運數字：${luckyNumber}\n`;
    fortune += `💡 ${advice}`;

    Logger.log('✓ 自建星座運勢生成成功：' + zodiac);
    return fortune;

  } catch (error) {
    Logger.log('❌ 自建星座運勢生成失敗：' + error.message);
    return '';
  }
}

/**
 * 簡化模式：檢查是否上班
 */
function checkSimpleMode(user, date) {
  const holidays = getUserHolidays(user.name);
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const isHoliday = holidays.includes(dateStr);
  const dayName = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];

  let reply = `📅 明天 ${date.getMonth() + 1}/${date.getDate()} (${dayName})\n\n`;

  if (isHoliday) {
    reply += `😴 休假啦\n好好休息～`;
  } else {
    reply += `💼 需要上班\n早點睡，上班加油！`;
  }

  // 加入天氣預報
  const weather = getWeatherForecast(user.city, date);
  if (weather) {
    reply += weather;
  }

  // 加入星座運勢
  if (user.zodiac) {
    const fortune = getZodiacFortune(user.zodiac, date);
    if (fortune) {
      reply += fortune;
    }
  }

  return reply;
}

/**
 * 完整模式：檢查班別
 */
function checkFullMode(user, date) {
  const shift = getShiftForDate(user.name, date);
  const dayName = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];

  let reply = `📅 明天 ${date.getMonth() + 1}/${date.getDate()} (${dayName})\n\n`;

  if (!shift || shift.includes('休息') || shift.includes('休假')) {
    reply += `😴 休假\n好好休息～`;
  } else {
    reply += `${shift}\n`;

    // 自動查找同班人員
    let myShiftType = '';
    if (shift.includes('夜班')) myShiftType = '夜班';
    else if (shift.includes('早班')) myShiftType = '早班';
    else if (shift.includes('中班')) myShiftType = '中班';

    if (myShiftType) {
      // 獲取所有員工
      const allEmployees = getAllEmployees();
      const coworkers = [];

      // 檢查每個員工的班別
      allEmployees.forEach(employee => {
        if (employee !== user.name) {
          const employeeShift = getShiftForDate(employee, date);
          if (employeeShift && employeeShift.includes(myShiftType)) {
            coworkers.push(`${employee} (${employeeShift})`);
          }
        }
      });

      // 添加同班人員信息
      if (coworkers.length > 0) {
        reply += `\n👥 同班人員 (${coworkers.length}人)：\n`;
        coworkers.forEach(coworker => {
          reply += `• ${coworker}\n`;
        });
      } else {
        reply += `\n👤 沒有其他同班人員`;
      }
    }

    reply += `\n早點睡，上班加油！`;
  }

  // 加入天氣預報
  const weather = getWeatherForecast(user.city, date);
  if (weather) {
    reply += weather;
  }

  // 加入星座運勢
  if (user.zodiac) {
    const fortune = getZodiacFortune(user.zodiac, date);
    if (fortune) {
      reply += fortune;
    }
  }

  return reply;
}

/**
 * 幫助資訊
 */
function getHelpMessage() {
  return `🤖 班表查詢 Bot 使用說明\n\n` +
    `📝 基礎命令：\n` +
    `• 綁定xxx [縣市] [星座] - 綁定身份\n` +
    `• 設定縣市 臺北市 - 修改天氣預報縣市\n` +
    `• 設定星座 天秤座 - 設定星座運勢\n` +
    `• 幫助 - 顯示此幫助\n\n` +
    `📅 查詢命令：\n` +
    `• 今天上班嗎 - 查詢今天的班別\n` +
    `• 明天上班嗎 - 查詢明天的班別\n` +
    `• 查詢11/9 - 查詢指定日期的班別\n` +
    `• 本週班表 - 查詢本週班表\n\n` +
    `😴 簡化模式（不在班表中）：\n` +
    `• 休假日 11/3,11/10 - 設定休假日\n` +
    `• 本月休假日 - 查看本月休假日\n\n` +
    `🌤️ 天氣預報：\n` +
    `• 所有查詢都會自動顯示天氣預報\n` +
    `• 支援全台 22 個縣市\n\n` +
    `✨ 星座運勢：\n` +
    `• 設定星座後，所有查詢會顯示每日運勢\n` +
    `• 支援 12 星座\n\n` +
    `💡 提示：命令中的空格可有可無`;
}

/**
 * 班別分類（從 Python 移植）
 */
function classifyShift(shiftCode) {
  if (!shiftCode) return '';

  const code = shiftCode.toString().trim().toUpperCase();

  // 優先處理特殊休假代碼
  if (['ML', 'AL', 'PL', 'SL'].includes(code)) {
    return code === 'SL' ? '🤒 病假' : '🏖️ 休假';
  }

  if (code === 'O') return '😴 休假';
  if (code === 'P') return '🏖️ 特休';
  if (code === 'BTD') return '🎂 生日假';

  // 夜班：所有 N 開頭
  if (code.startsWith('N')) return `🌙 夜班 ${code}`;

  // 早班：所有 M 開頭
  if (code.startsWith('M')) return `🌅 早班 ${code}`;

  // 中班：所有 A 開頭
  if (code.startsWith('A')) return `🌤️ 中班 ${code}`;

  return code;
}

/**
 * 回覆訊息
 */
function replyMessage(replyToken, message) {
  const url = 'https://api.line.me/v2/bot/message/reply';
  const payload = {
    replyToken: replyToken,
    messages: [{
      type: 'text',
      text: message
    }]
  };

  const options = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN
    },
    payload: JSON.stringify(payload)
  };

  UrlFetchApp.fetch(url, options);
}

/**
 * 推送訊息給用戶
 */
function pushMessage(userId, message) {
  const url = 'https://api.line.me/v2/bot/message/push';
  const payload = {
    to: userId,
    messages: [{
      type: 'text',
      text: message
    }]
  };

  const options = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN
    },
    payload: JSON.stringify(payload)
  };

  UrlFetchApp.fetch(url, options);
}

// ==================== 定時通知 ====================

/**
 * 每天早上 9:00 執行 - 通知今天上夜班的人
 */
function sendMorningNotifications() {
  try {
    Logger.log('========================================');
    Logger.log('開始執行早上通知 - ' + new Date().toLocaleString('zh-TW'));
    Logger.log('========================================');

    // 驗證配置
    const configCheck = validateSpreadsheetConfig();
    if (!configCheck.valid) {
      Logger.log('❌ 配置驗證失敗：');
      Logger.log(configCheck.error);
      Logger.log('');
      Logger.log('請修正配置後再試。');
      return;
    }
    Logger.log('✓ 配置驗證通過');

    // 取得用戶資料
    const sheet = configCheck.spreadsheet.getSheetByName(SHEET_USERS);
    if (!sheet) {
      Logger.log('❌ 找不到工作表：' + SHEET_USERS);
      return;
    }

    const data = sheet.getDataRange().getValues();
    Logger.log('✓ 成功讀取用戶資料，共 ' + (data.length - 1) + ' 位用戶');

    const today = new Date();
    let notificationCount = 0;
    let errorCount = 0;

    for (let i = 1; i < data.length; i++) {
      try {
        const userId = data[i][0];
        const name = data[i][1];
        const mode = data[i][2];
        const group = data[i][3];
        const city = data[i][4] || DEFAULT_CITY; // 如果沒設定，使用預設縣市

        if (!userId || !name) {
          continue;
        }

        const user = { userId, name, mode, group, city };

        // 早上只通知夜班人員（不管今天是否休假）
        // 早班/中班的人在前一天晚上收到通知
        // 簡化模式的人統一在晚上 9 點收到明天的通知
        if (mode === '完整') {
          const shiftType = getUserShiftType(name, today);
          if (shiftType === '夜班') {
            const message = checkFullMode(user, today);
            pushMessage(userId, message.replace('明天', '今天'));
            notificationCount++;
            const shift = getShiftForDate(name, today);
            Logger.log('✓ 已通知 ' + name + ' (夜班人員, 今天: ' + (shift || '無資料') + ')');
          }
        }
      } catch (userError) {
        errorCount++;
        Logger.log('❌ 處理用戶 ' + (data[i][1] || '未知') + ' 時發生錯誤：' + userError.message);
      }
    }

    Logger.log('');
    Logger.log('早上通知完成：');
    Logger.log('  成功發送：' + notificationCount + ' 則');
    Logger.log('  發生錯誤：' + errorCount + ' 則');
    Logger.log('========================================');

  } catch (error) {
    Logger.log('');
    Logger.log('❌❌❌ 早上通知執行失敗 ❌❌❌');
    Logger.log('錯誤訊息：' + error.message);
    Logger.log('錯誤堆疊：');
    Logger.log(error.stack);
    Logger.log('========================================');
  }
}

/**
 * 每天晚上 21:00 執行 - 通知早班/中班
 */
function sendEveningNotifications() {
  try {
    Logger.log('========================================');
    Logger.log('開始執行晚上通知 - ' + new Date().toLocaleString('zh-TW'));
    Logger.log('========================================');

    // 驗證配置
    const configCheck = validateSpreadsheetConfig();
    if (!configCheck.valid) {
      Logger.log('❌ 配置驗證失敗：');
      Logger.log(configCheck.error);
      Logger.log('');
      Logger.log('請修正配置後再試。');
      return;
    }
    Logger.log('✓ 配置驗證通過');

    // 取得用戶資料
    const sheet = configCheck.spreadsheet.getSheetByName(SHEET_USERS);
    if (!sheet) {
      Logger.log('❌ 找不到工作表：' + SHEET_USERS);
      return;
    }

    const data = sheet.getDataRange().getValues();
    Logger.log('✓ 成功讀取用戶資料，共 ' + (data.length - 1) + ' 位用戶');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    let notificationCount = 0;
    let errorCount = 0;

    for (let i = 1; i < data.length; i++) {
      try {
        const userId = data[i][0];
        const name = data[i][1];
        const mode = data[i][2];
        const group = data[i][3];
        const city = data[i][4] || DEFAULT_CITY; // 如果沒設定，使用預設縣市

        if (!userId || !name) {
          continue;
        }

        const user = { userId, name, mode, group, city };

        if (mode === '簡化') {
          const message = checkSimpleMode(user, tomorrow);
          pushMessage(userId, message);
          notificationCount++;
          Logger.log('✓ 已通知 ' + name + ' (簡化模式)');
        } else if (mode === '完整') {
          // 晚上通知早班/中班人員（不管明天是否休假）
          const shiftType = getUserShiftType(name, tomorrow);
          if (shiftType === '早班' || shiftType === '中班') {
            const message = checkFullMode(user, tomorrow);
            pushMessage(userId, message);
            notificationCount++;
            const shift = getShiftForDate(name, tomorrow);
            Logger.log('✓ 已通知 ' + name + ' (' + shiftType + '人員, 明天: ' + (shift || '無資料') + ')');
          }
        }
      } catch (userError) {
        errorCount++;
        Logger.log('❌ 處理用戶 ' + (data[i][1] || '未知') + ' 時發生錯誤：' + userError.message);
      }
    }

    Logger.log('');
    Logger.log('晚上通知完成：');
    Logger.log('  成功發送：' + notificationCount + ' 則');
    Logger.log('  發生錯誤：' + errorCount + ' 則');
    Logger.log('========================================');

  } catch (error) {
    Logger.log('');
    Logger.log('❌❌❌ 晚上通知執行失敗 ❌❌❌');
    Logger.log('錯誤訊息：' + error.message);
    Logger.log('錯誤堆疊：');
    Logger.log(error.stack);
    Logger.log('========================================');
  }
}

/**
 * 🧪 測試早上通知功能
 *
 * 使用方法：
 * 1. 在上方選擇函數下拉選單中選擇 "testMorningNotifications"
 * 2. 點擊「執行」按鈕
 * 3. 查看執行日誌（畫面下方會顯示詳細的執行過程）
 *
 * 這個函數會：
 * - 驗證 SPREADSHEET_ID 配置
 * - 模擬執行早上通知流程（但不會真的發送訊息）
 * - 顯示哪些用戶會收到通知
 */
function testMorningNotifications() {
  Logger.log('========================================');
  Logger.log('🧪 測試早上通知功能');
  Logger.log('========================================');
  Logger.log('');

  try {
    // 驗證配置
    const configCheck = validateSpreadsheetConfig();
    if (!configCheck.valid) {
      Logger.log('❌ 配置驗證失敗：');
      Logger.log(configCheck.error);
      Logger.log('');
      Logger.log('請修正配置後再試。');
      return;
    }
    Logger.log('✓ 配置驗證通過');
    Logger.log('  試算表名稱：' + configCheck.spreadsheet.getName());
    Logger.log('');

    // 取得用戶資料
    const sheet = configCheck.spreadsheet.getSheetByName(SHEET_USERS);
    if (!sheet) {
      Logger.log('❌ 找不到工作表：' + SHEET_USERS);
      return;
    }

    const data = sheet.getDataRange().getValues();
    Logger.log('✓ 成功讀取用戶資料，共 ' + (data.length - 1) + ' 位用戶');
    Logger.log('');

    const today = new Date();
    Logger.log('測試日期：' + today.toLocaleDateString('zh-TW'));
    Logger.log('');

    // 先顯示所有用戶資料
    Logger.log('【所有用戶資料】');
    for (let i = 1; i < data.length; i++) {
      const userId = data[i][0];
      const name = data[i][1];
      const mode = data[i][2];
      const group = data[i][3];
      Logger.log((i) + '. userId=' + userId + ', name=' + name + ', mode=' + mode + ', group=' + group);
    }
    Logger.log('');

    Logger.log('【檢查每個用戶的班別】');
    let notificationCount = 0;

    for (let i = 1; i < data.length; i++) {
      const userId = data[i][0];
      const name = data[i][1];
      const mode = data[i][2];
      const group = data[i][3];

      Logger.log('--- 檢查用戶 ' + i + ': ' + name + ' ---');

      if (!userId || !name) {
        Logger.log('⊗ 跳過：userId 或 name 為空');
        continue;
      }

      Logger.log('  模式：' + mode);

      if (mode === '完整') {
        Logger.log('  → 判斷班別類型...');
        const shiftType = getUserShiftType(name, today);
        Logger.log('  → 班別類型：「' + (shiftType || '無法判斷') + '」');

        const shift = getShiftForDate(name, today);
        Logger.log('  → 今天班別：「' + (shift || '無資料') + '」');

        if (shiftType === '夜班') {
          notificationCount++;
          Logger.log('  ✓ 符合條件！會收到通知（夜班人員，不論今天是否休假）');
        } else if (shiftType === '早班' || shiftType === '中班') {
          Logger.log('  ⊗ ' + shiftType + '人員（在前一天晚上收到明天的通知）');
        } else {
          Logger.log('  ⊗ 無法判斷班別類型');
        }
      } else {
        Logger.log('  ⊗ 跳過：簡化模式（早上只通知完整模式的夜班人員，簡化模式在晚上通知）');
      }
      Logger.log('');
    }

    Logger.log('========================================');
    Logger.log('【會收到早上通知的用戶】');
    Logger.log('---');

    let displayCount = 0;
    for (let i = 1; i < data.length; i++) {
      const userId = data[i][0];
      const name = data[i][1];
      const mode = data[i][2];
      const group = data[i][3];

      if (!userId || !name) {
        continue;
      }

      if (mode === '完整') {
        const shiftType = getUserShiftType(name, today);
        if (shiftType === '夜班') {
          displayCount++;
          const shift = getShiftForDate(name, today);
          Logger.log(displayCount + '. ' + name + ' (夜班人員) - 今天: ' + (shift || '無資料') + ' (組別: ' + (group || '無') + ')');
        }
      }
    }

    Logger.log('---');
    Logger.log('');
    Logger.log('總計會發送 ' + notificationCount + ' 則通知');
    Logger.log('');
    Logger.log('✅ 測試完成！如果要實際發送通知，請執行 sendMorningNotifications 函數');

  } catch (error) {
    Logger.log('');
    Logger.log('❌ 測試失敗');
    Logger.log('錯誤訊息：' + error.message);
    Logger.log('錯誤堆疊：');
    Logger.log(error.stack);
  }

  Logger.log('========================================');
}

/**
 * 🧪 測試晚上通知功能
 *
 * 使用方法：
 * 1. 在上方選擇函數下拉選單中選擇 "testEveningNotifications"
 * 2. 點擊「執行」按鈕
 * 3. 查看執行日誌
 *
 * 這個函數會：
 * - 驗證 SPREADSHEET_ID 配置
 * - 模擬執行晚上通知流程（但不會真的發送訊息）
 * - 顯示哪些用戶會收到通知
 */
function testEveningNotifications() {
  Logger.log('========================================');
  Logger.log('🧪 測試晚上通知功能');
  Logger.log('========================================');
  Logger.log('');

  try {
    // 驗證配置
    const configCheck = validateSpreadsheetConfig();
    if (!configCheck.valid) {
      Logger.log('❌ 配置驗證失敗：');
      Logger.log(configCheck.error);
      Logger.log('');
      Logger.log('請修正配置後再試。');
      return;
    }
    Logger.log('✓ 配置驗證通過');
    Logger.log('  試算表名稱：' + configCheck.spreadsheet.getName());
    Logger.log('');

    // 取得用戶資料
    const sheet = configCheck.spreadsheet.getSheetByName(SHEET_USERS);
    if (!sheet) {
      Logger.log('❌ 找不到工作表：' + SHEET_USERS);
      return;
    }

    const data = sheet.getDataRange().getValues();
    Logger.log('✓ 成功讀取用戶資料，共 ' + (data.length - 1) + ' 位用戶');
    Logger.log('');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    Logger.log('測試日期（明天）：' + tomorrow.toLocaleDateString('zh-TW'));
    Logger.log('');

    // 先顯示所有用戶資料
    Logger.log('【所有用戶資料】');
    for (let i = 1; i < data.length; i++) {
      const userId = data[i][0];
      const name = data[i][1];
      const mode = data[i][2];
      const group = data[i][3];
      Logger.log((i) + '. userId=' + userId + ', name=' + name + ', mode=' + mode + ', group=' + group);
    }
    Logger.log('');

    Logger.log('【檢查每個用戶的班別】');
    let notificationCount = 0;

    for (let i = 1; i < data.length; i++) {
      const userId = data[i][0];
      const name = data[i][1];
      const mode = data[i][2];
      const group = data[i][3];

      Logger.log('--- 檢查用戶 ' + i + ': ' + name + ' ---');

      if (!userId || !name) {
        Logger.log('⊗ 跳過：userId 或 name 為空');
        continue;
      }

      Logger.log('  模式：' + mode);

      if (mode === '簡化') {
        notificationCount++;
        Logger.log('  ✓ 符合條件！會收到通知（簡化模式固定在晚上通知）');
      } else if (mode === '完整') {
        Logger.log('  → 判斷班別類型...');
        const shiftType = getUserShiftType(name, tomorrow);
        Logger.log('  → 班別類型：「' + (shiftType || '無法判斷') + '」');

        const shift = getShiftForDate(name, tomorrow);
        Logger.log('  → 明天班別：「' + (shift || '無資料') + '」');

        if (shiftType === '早班' || shiftType === '中班') {
          notificationCount++;
          Logger.log('  ✓ 符合條件！會收到通知（' + shiftType + '人員，不論明天是否休假）');
        } else if (shiftType === '夜班') {
          Logger.log('  ⊗ 夜班人員（在早上收到今天的通知）');
        } else {
          Logger.log('  ⊗ 無法判斷班別類型');
        }
      }
      Logger.log('');
    }

    Logger.log('========================================');
    Logger.log('【會收到晚上通知的用戶】');
    Logger.log('---');

    let displayCount = 0;
    for (let i = 1; i < data.length; i++) {
      const userId = data[i][0];
      const name = data[i][1];
      const mode = data[i][2];
      const group = data[i][3];

      if (!userId || !name) {
        continue;
      }

      if (mode === '簡化') {
        displayCount++;
        Logger.log(displayCount + '. ' + name + ' - 簡化模式 (組別: ' + (group || '無') + ')');
      } else if (mode === '完整') {
        const shiftType = getUserShiftType(name, tomorrow);
        if (shiftType === '早班' || shiftType === '中班') {
          displayCount++;
          const shift = getShiftForDate(name, tomorrow);
          Logger.log(displayCount + '. ' + name + ' - ' + shiftType + '人員, 明天: ' + (shift || '無資料') + ' (組別: ' + (group || '無') + ')');
        }
      }
    }

    Logger.log('---');
    Logger.log('');
    Logger.log('總計會發送 ' + notificationCount + ' 則通知');
    Logger.log('');
    Logger.log('✅ 測試完成！如果要實際發送通知，請執行 sendEveningNotifications 函數');

  } catch (error) {
    Logger.log('');
    Logger.log('❌ 測試失敗');
    Logger.log('錯誤訊息：' + error.message);
    Logger.log('錯誤堆疊：');
    Logger.log(error.stack);
  }

  Logger.log('========================================');
}
