/**
 * LINE Bot 班表查询系统 - Google Apps Script 版本
 *
 * 功能：
 * 1. 支持完整班表模式（复杂班别：N1/N2/M1/M2等）
 * 2. 支持简化模式（只需设置休息日）
 * 3. 自动定时通知（早上9点通知夜班，晚上9点通知早班/中班）
 * 4. 双公司支持，数据完全独立
 */

// ==================== 配置区 ====================
// 👇 请填入你的 LINE Bot 信息
const LINE_CHANNEL_ACCESS_TOKEN = 'YOUR_CHANNEL_ACCESS_TOKEN_HERE';

// Google Sheet 的 Tab 名称（请勿修改，除非你改了 Sheet 的 Tab 名称）
const SHEET_USERS = '用户配置';
const SHEET_SCHEDULE = '完整班表';
const SHEET_GROUPS = '组别配置';
const SHEET_HOLIDAYS = '休息日记录';

// ==================== LINE Webhook 入口 ====================

/**
 * LINE Webhook 入口函数
 * 当用户在 LINE 发送消息时，会触发这个函数
 */
function doPost(e) {
  try {
    const json = JSON.parse(e.postData.contents);
    const events = json.events;

    events.forEach(event => {
      if (event.type === 'message' && event.message.type === 'text') {
        handleTextMessage(event);
      }
    });

    return ContentService.createTextOutput(JSON.stringify({status: 'ok'}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('Error: ' + error);
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==================== 消息处理 ====================

/**
 * 处理文字消息
 */
function handleTextMessage(event) {
  const userId = event.source.userId;
  const message = event.message.text.trim();
  const replyToken = event.replyToken;

  let replyText = '';

  // 命令路由
  if (message.startsWith('绑定 ')) {
    replyText = handleBindUser(userId, message);
  }
  else if (message.startsWith('休息日 ')) {
    replyText = handleSetHolidays(userId, message);
  }
  else if (message === '明天上班吗' || message === '明天上班嗎') {
    replyText = handleCheckTomorrow(userId);
  }
  else if (message === '本周班表') {
    replyText = handleCheckWeek(userId);
  }
  else if (message === '同班人员' || message === '同班人員') {
    replyText = handleCheckCoworkers(userId);
  }
  else if (message === '本月休息日') {
    replyText = handleCheckMonthHolidays(userId);
  }
  else if (message === '帮助' || message === '幫助' || message === 'help') {
    replyText = getHelpMessage();
  }
  else {
    replyText = '不好意思，我不太懂这个命令。\n输入「帮助」查看可用命令。';
  }

  // 回复消息
  replyMessage(replyToken, replyText);
}

/**
 * 绑定用户
 * 格式：绑定 姓名 [组别]
 * 例如：绑定 Jessica M1组  (完整模式)
 * 例如：绑定 John          (简化模式)
 */
function handleBindUser(userId, message) {
  const parts = message.replace('绑定 ', '').split(' ');
  const name = parts[0];
  const group = parts.length > 1 ? parts[1] : '';
  const mode = group ? '完整' : '简化';

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_USERS);

  // 检查是否已经绑定
  const data = sheet.getDataRange().getValues();
  let found = false;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      // 更新现有记录
      sheet.getRange(i + 1, 2, 1, 3).setValues([[name, mode, group]]);
      found = true;
      break;
    }
  }

  if (!found) {
    // 新增记录
    sheet.appendRow([userId, name, mode, group]);
  }

  let reply = `✅ 绑定成功！\n\n`;
  reply += `👤 姓名：${name}\n`;
  reply += `📊 模式：${mode}模式\n`;

  if (mode === '完整') {
    reply += `👥 组别：${group}\n\n`;
    reply += `你可以使用以下命令：\n`;
    reply += `• 明天上班吗\n`;
    reply += `• 本周班表\n`;
    reply += `• 同班人员\n`;
  } else {
    reply += `\n`;
    reply += `请设置你的休息日：\n`;
    reply += `例如：休息日 11/3,11/10,11/17\n\n`;
    reply += `设置后系统会每天自动提醒你！`;
  }

  return reply;
}

/**
 * 设置休息日（简化模式）
 * 格式：休息日 11/3,11/10,11/17,11/24
 */
function handleSetHolidays(userId, message) {
  const user = getUserInfo(userId);
  if (!user) {
    return '❌ 请先绑定身份！\n例如：绑定 John';
  }

  if (user.mode !== '简化') {
    return '❌ 你使用的是完整模式，不需要设置休息日。';
  }

  // 解析休息日
  const dateStr = message.replace('休息日 ', '').trim();
  const dates = dateStr.split(',').map(d => d.trim());

  // 转换为完整日期格式
  const year = new Date().getFullYear();
  const fullDates = dates.map(d => {
    const [month, day] = d.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  });

  // 保存到 Sheet
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_HOLIDAYS);
  const data = sheet.getDataRange().getValues();

  let found = false;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === user.name) {
      // 更新现有记录
      sheet.getRange(i + 1, 2).setValue(fullDates.join(','));
      found = true;
      break;
    }
  }

  if (!found) {
    sheet.appendRow([user.name, fullDates.join(',')]);
  }

  // 生成回复
  let reply = `✅ 已设置休息日：\n\n`;
  dates.forEach(d => {
    reply += `📅 ${d}\n`;
  });
  reply += `\n系统会在每天自动提醒你！`;

  return reply;
}

/**
 * 查询明天是否上班
 */
function handleCheckTomorrow(userId) {
  const user = getUserInfo(userId);
  if (!user) {
    return '❌ 请先绑定身份！\n例如：绑定 Jessica M1组\n或：绑定 John';
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (user.mode === '简化') {
    return checkSimpleMode(user, tomorrow);
  } else {
    return checkFullMode(user, tomorrow);
  }
}

/**
 * 查询本周班表
 */
function handleCheckWeek(userId) {
  const user = getUserInfo(userId);
  if (!user) {
    return '❌ 请先绑定身份！';
  }

  if (user.mode === '简化') {
    return '简化模式不支持本周班表查询。\n可以查看「本月休息日」。';
  }

  // 获取本周日期范围
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  let reply = `📅 ${user.name} 的本周班表\n`;
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
 * 查询明天同班人员
 */
function handleCheckCoworkers(userId) {
  const user = getUserInfo(userId);
  if (!user) {
    return '❌ 请先绑定身份！';
  }

  if (user.mode === '简化') {
    return '简化模式不支持同班人员查询。';
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const myShift = getShiftForDate(user.name, tomorrow);
  if (!myShift || myShift.includes('休息') || myShift.includes('休假')) {
    return '明天你休息，没有同班人员。';
  }

  // 获取组员
  const groupMembers = getGroupMembers(user.group);
  const coworkers = [];

  groupMembers.forEach(member => {
    if (member !== user.name) {
      const shift = getShiftForDate(member, tomorrow);
      if (shift && !shift.includes('休息') && !shift.includes('休假')) {
        coworkers.push(`${member} (${shift})`);
      }
    }
  });

  if (coworkers.length === 0) {
    return '明天只有你一个人上班。';
  }

  let reply = `👥 明天同班人员：\n\n`;
  coworkers.forEach(c => reply += `• ${c}\n`);

  return reply;
}

/**
 * 查询本月休息日
 */
function handleCheckMonthHolidays(userId) {
  const user = getUserInfo(userId);
  if (!user) {
    return '❌ 请先绑定身份！';
  }

  if (user.mode !== '简化') {
    return '完整模式不支持此命令。';
  }

  const holidays = getUserHolidays(user.name);
  if (holidays.length === 0) {
    return '你还没有设置休息日。\n例如：休息日 11/3,11/10,11/17';
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
      reply += ` (还有${daysLeft}天)`;
    } else {
      reply += ` (已过)`;
    }
    reply += '\n';
  });

  return reply;
}

// ==================== 辅助函数 ====================

/**
 * 获取用户信息
 */
function getUserInfo(userId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_USERS);
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
 * 获取用户休息日列表
 */
function getUserHolidays(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_HOLIDAYS);
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
 * 查询指定日期的班别
 */
function getShiftForDate(name, date) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SCHEDULE);
  const data = sheet.getDataRange().getValues();

  // 第一行是标题，找到姓名对应的列
  const headers = data[0];
  let nameCol = -1;
  for (let i = 0; i < headers.length; i++) {
    if (headers[i] === name) {
      nameCol = i;
      break;
    }
  }

  if (nameCol === -1) return '';

  // 找到日期对应的行
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
 * 获取组员列表
 */
function getGroupMembers(groupName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_GROUPS);
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
 * 简化模式：检查是否上班
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
    reply += `💼 需要上班\n早点睡，明天加油！`;
  }

  return reply;
}

/**
 * 完整模式：检查班别
 */
function checkFullMode(user, date) {
  const shift = getShiftForDate(user.name, date);
  const dayName = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];

  let reply = `📅 明天 ${date.getMonth() + 1}/${date.getDate()} (${dayName})\n\n`;

  if (!shift || shift.includes('休息') || shift.includes('休假')) {
    reply += `😴 休息\n好好休息～`;
  } else {
    reply += `${shift}\n早点睡，明天加油！`;
  }

  return reply;
}

/**
 * 帮助信息
 */
function getHelpMessage() {
  return `🤖 班表查询 Bot 使用说明\n\n` +
    `📝 基础命令：\n` +
    `• 绑定 [姓名] [组别] - 绑定身份\n` +
    `• 帮助 - 显示此帮助\n\n` +
    `📊 完整模式（有组别）：\n` +
    `• 明天上班吗\n` +
    `• 本周班表\n` +
    `• 同班人员\n\n` +
    `😴 简化模式（无组别）：\n` +
    `• 休息日 11/3,11/10,11/17\n` +
    `• 明天上班吗\n` +
    `• 本月休息日`;
}

/**
 * 班别分类（从 Python 移植）
 */
function classifyShift(shiftCode) {
  if (!shiftCode) return '';

  const code = shiftCode.toString().trim().toUpperCase();

  // 优先处理特殊休假代码
  if (['ML', 'AL', 'PL', 'SL'].includes(code)) {
    return code === 'SL' ? '🤒 病假' : '🏖️ 休假';
  }

  if (code === 'O') return '😴 休息';
  if (code === 'P') return '🏖️ 休假';
  if (code === 'BTD') return '✈️ 出差';

  // 夜班：所有 N 开头
  if (code.startsWith('N')) return `🌙 夜班 ${code}`;

  // 早班：所有 M 开头
  if (code.startsWith('M')) return `🌅 早班 ${code}`;

  // 中班：所有 A 开头
  if (code.startsWith('A')) return `🌤️ 中班 ${code}`;

  return code;
}

/**
 * 回复消息
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
 * 推送消息给用户
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

// ==================== 定时通知 ====================

/**
 * 每天早上 9:00 执行 - 通知夜班
 */
function sendMorningNotifications() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_USERS);
  const data = sheet.getDataRange().getValues();

  const today = new Date();

  for (let i = 1; i < data.length; i++) {
    const userId = data[i][0];
    const name = data[i][1];
    const mode = data[i][2];
    const group = data[i][3];

    const user = { userId, name, mode, group };

    if (mode === '简化') {
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
 * 每天晚上 21:00 执行 - 通知早班/中班
 */
function sendEveningNotifications() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_USERS);
  const data = sheet.getDataRange().getValues();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  for (let i = 1; i < data.length; i++) {
    const userId = data[i][0];
    const name = data[i][1];
    const mode = data[i][2];
    const group = data[i][3];

    const user = { userId, name, mode, group };

    if (mode === '简化') {
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
 * 测试函数 - 用于调试
 */
function testNotification() {
  Logger.log('Testing notifications...');
  // 可以在这里测试单个用户的通知
}
