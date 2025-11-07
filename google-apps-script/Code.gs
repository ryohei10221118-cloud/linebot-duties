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

  // 命令路由
  if (message.startsWith('綁定 ')) {
    replyText = handleBindUser(userId, message);
  }
  else if (message.startsWith('休息日 ')) {
    replyText = handleSetHolidays(userId, message);
  }
  else if (message === '明天上班嗎') {
    replyText = handleCheckTomorrow(userId);
  }
  else if (message === '本週班表') {
    replyText = handleCheckWeek(userId);
  }
  else if (message === '同班人員') {
    replyText = handleCheckCoworkers(userId);
  }
  else if (message === '本月休息日') {
    replyText = handleCheckMonthHolidays(userId);
  }
  else if (message === '幫助' || message === 'help') {
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
 * 格式：綁定 姓名
 * 系統會自動檢查是否在完整班表中，來決定使用哪種模式
 */
function handleBindUser(userId, message) {
  const name = message.replace('綁定 ', '').trim();

  // 檢查是否在完整班表中
  const allEmployees = getAllEmployees();
  const isInSchedule = allEmployees.includes(name);

  // 自動判斷模式
  const mode = isInSchedule ? '完整' : '簡化';

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_USERS);

  // 檢查是否已經綁定
  const data = sheet.getDataRange().getValues();
  let found = false;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      // 更新現有記錄
      sheet.getRange(i + 1, 2, 1, 3).setValues([[name, mode, '']]);
      found = true;
      break;
    }
  }

  if (!found) {
    // 新增記錄
    sheet.appendRow([userId, name, mode, '']);
  }

  let reply = `✅ 綁定成功！\n\n`;
  reply += `👤 姓名：${name}\n`;
  reply += `📊 模式：${mode}模式\n`;

  if (mode === '完整') {
    reply += `\n你可以使用以下命令：\n`;
    reply += `• 明天上班嗎\n`;
    reply += `• 本週班表\n`;
    reply += `• 同班人員\n`;
  } else {
    reply += `\n`;
    reply += `請設置你的休息日：\n`;
    reply += `例如：休息日 11/3,11/10,11/17\n\n`;
    reply += `設置後系統會每天自動提醒你！`;
  }

  return reply;
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

  // 解析休息日
  const dateStr = message.replace('休息日 ', '').trim();
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
 * 查詢明天是否上班
 */
function handleCheckTomorrow(userId) {
  const user = getUserInfo(userId);
  if (!user) {
    return '❌ 請先綁定身份！\n例如：綁定 Jessica M1組\n或：綁定 John';
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
 * 查詢本週班表
 */
function handleCheckWeek(userId) {
  const user = getUserInfo(userId);
  if (!user) {
    return '❌ 請先綁定身份！';
  }

  if (user.mode === '簡化') {
    return '簡化模式不支援本週班表查詢。\n可以查看「本月休息日」。';
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
 * 查詢本月休息日
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
    return '你還沒有設置休息日。\n例如：休息日 11/3,11/10,11/17';
  }

  const today = new Date();
  let reply = `📅 你的休息日：\n\n`;

  holidays.forEach(h => {
    const hDate = new Date(h);
    const isPast = hDate < today;
    const emoji = isPast ? '✅' : '⏰';
    reply += `${emoji} ${hDate.getMonth() + 1}/${hDate.getDate()}`;
    if (!isPast) {
      const daysLeft = Math.ceil((hDate - today) / (1000 * 60 * 60 * 24));
      reply += ` (還有${daysLeft}天)`;
    } else {
      reply += ` (已過)`;
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
        group: data[i][3]
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
 * 查詢指定日期的班別
 */
function getShiftForDate(name, date) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_SCHEDULE);
  const data = sheet.getDataRange().getValues();

  // 第一行是標題，找到姓名對應的列
  const headers = data[0];
  let nameCol = -1;
  for (let i = 0; i < headers.length; i++) {
    if (headers[i] === name) {
      nameCol = i;
      break;
    }
  }

  if (nameCol === -1) return '';

  // 找到日期對應的行
  const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString().includes(dateStr)) {
      const shift = data[i][nameCol];
      return classifyShift(shift);
    }
  }

  return '';
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
 * 從完整班表的標題行讀取
 */
function getAllEmployees() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_SCHEDULE);
  const data = sheet.getDataRange().getValues();

  if (data.length === 0) return [];

  // 第一行是標題，第一列是日期，其他列是員工姓名
  const headers = data[0];
  const employees = [];

  for (let i = 1; i < headers.length; i++) {
    if (headers[i]) {
      employees.push(headers[i]);
    }
  }

  return employees;
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
    reply += `😴 休息日\n好好休息～`;
  } else {
    reply += `💼 需要上班\n早點睡，明天加油！`;
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
    reply += `😴 休息\n好好休息～`;
  } else {
    reply += `${shift}\n早點睡，明天加油！`;
  }

  return reply;
}

/**
 * 幫助資訊
 */
function getHelpMessage() {
  return `🤖 班表查詢 Bot 使用說明\n\n` +
    `📝 基礎命令：\n` +
    `• 綁定 [姓名] [組別] - 綁定身份\n` +
    `• 幫助 - 顯示此幫助\n\n` +
    `📊 完整模式（有組別）：\n` +
    `• 明天上班嗎\n` +
    `• 本週班表\n` +
    `• 同班人員\n\n` +
    `😴 簡化模式（無組別）：\n` +
    `• 休息日 11/3,11/10,11/17\n` +
    `• 明天上班嗎\n` +
    `• 本月休息日`;
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

  if (code === 'O') return '😴 休息';
  if (code === 'P') return '🏖️ 休假';
  if (code === 'BTD') return '✈️ 出差';

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
 * 每天早上 9:00 執行 - 通知夜班
 */
function sendMorningNotifications() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_USERS);
  const data = sheet.getDataRange().getValues();

  const today = new Date();

  for (let i = 1; i < data.length; i++) {
    const userId = data[i][0];
    const name = data[i][1];
    const mode = data[i][2];
    const group = data[i][3];

    const user = { userId, name, mode, group };

    if (mode === '簡化') {
      const message = checkSimpleMode(user, today);
      pushMessage(userId, message.replace('明天', '今天'));
    } else {
      const shift = getShiftForDate(name, today);
      if (shift && shift.includes('夜班')) {
        const message = checkFullMode(user, today);
        pushMessage(userId, message.replace('明天', '今天'));
      }
    }
  }
}

/**
 * 每天晚上 21:00 執行 - 通知早班/中班
 */
function sendEveningNotifications() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_USERS);
  const data = sheet.getDataRange().getValues();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  for (let i = 1; i < data.length; i++) {
    const userId = data[i][0];
    const name = data[i][1];
    const mode = data[i][2];
    const group = data[i][3];

    const user = { userId, name, mode, group };

    if (mode === '簡化') {
      const message = checkSimpleMode(user, tomorrow);
      pushMessage(userId, message);
    } else {
      const shift = getShiftForDate(name, tomorrow);
      if (shift && (shift.includes('早班') || shift.includes('中班') || shift.includes('休息'))) {
        const message = checkFullMode(user, tomorrow);
        pushMessage(userId, message);
      }
    }
  }
}

/**
 * 測試函數 - 用於調試
 */
function testNotification() {
  Logger.log('Testing notifications...');
  // 可以在這裡測試單個用戶的通知
}
