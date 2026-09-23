/**
 * ==================== 請假功能 ====================
 * LINE 指令：請假 9/30、明天請假、請假 9/30,10/1、取消請假 9/30、請假紀錄
 * 請假日期存在指令碼屬性，不會修改原本的班表
 */

const LEAVE_PREFIX = 'leave_';
let leaveCache = null;

function toLeaveKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function fromLeaveKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function getLeaveMap() {
  if (leaveCache) {
    return leaveCache;
  }

  leaveCache = {};
  const props = PropertiesService.getScriptProperties().getProperties();
  Object.keys(props).forEach(key => {
    if (key.startsWith(LEAVE_PREFIX)) {
      leaveCache[key.slice(LEAVE_PREFIX.length)] = JSON.parse(props[key]);
    }
  });
  return leaveCache;
}

/**
 * 取得某人今天以後的請假日期（已排序）
 */
function getUpcomingLeaveKeys(name) {
  const todayKey = toLeaveKey(startOfToday());
  return (getLeaveMap()[name] || []).filter(key => key >= todayKey).sort();
}

function isOnLeave(name, date) {
  return (getLeaveMap()[name] || []).includes(toLeaveKey(date));
}

function saveLeaveKeys(name, keys) {
  const props = PropertiesService.getScriptProperties();
  if (keys.length === 0) {
    props.deleteProperty(LEAVE_PREFIX + name);
  } else {
    props.setProperty(LEAVE_PREFIX + name, JSON.stringify(keys));
  }
  getLeaveMap()[name] = keys;
}

/**
 * 解析「明天」「今天」「後天」「9/30」，可用空格、逗號、頓號分隔多個
 * 月/日早於今天的視為明年
 * @returns {Date[]|null} 格式錯誤時回傳 null
 */
function parseLeaveDates(text) {
  const today = startOfToday();
  const tokens = text.split(/[\s,，、]+/).filter(Boolean);
  if (tokens.length === 0) {
    return null;
  }

  const relativeDays = { '今天': 0, '明天': 1, '後天': 2, '后天': 2 };
  const dates = [];

  for (const token of tokens) {
    let date;
    if (token in relativeDays) {
      date = new Date(today);
      date.setDate(today.getDate() + relativeDays[token]);
    } else {
      const match = token.match(/^(\d{1,2})\/(\d{1,2})$/);
      if (!match) {
        return null;
      }
      const month = parseInt(match[1], 10);
      const day = parseInt(match[2], 10);
      date = new Date(today.getFullYear(), month - 1, day);
      if (date.getMonth() !== month - 1 || date.getDate() !== day) {
        return null;
      }
      if (date < today) {
        date.setFullYear(date.getFullYear() + 1);
      }
    }
    dates.push(date);
  }
  return dates;
}

function formatLeaveDate(date) {
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return `${date.getMonth() + 1}/${date.getDate()} (${weekdays[date.getDay()]})`;
}

function removeShiftEventFromCalendar(name, date) {
  const calendars = CalendarApp.getCalendarsByName(CALENDAR_NAME);
  if (calendars.length === 0) {
    return;
  }
  calendars[0].getEventsForDay(date).forEach(event => {
    if (event.getTitle().startsWith(name + ' - ')) {
      event.deleteEvent();
    }
  });
}

/**
 * 今天或明天的請假異動，鬧鐘可能已經設定好了，提醒用戶自己處理
 * 只提醒有在用鬧鐘捷徑（回報過）的人
 */
function getLeaveAlarmNotes(name, dates, isCancel) {
  const props = PropertiesService.getScriptProperties();
  const lastReport = props.getProperty(ALARM_REPORT_PREFIX + name);
  if (!lastReport) {
    return [];
  }

  const todayKey = toLeaveKey(startOfToday());
  const tomorrow = startOfToday();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = toLeaveKey(tomorrow);
  const keys = dates.map(toLeaveKey);
  const notes = [];

  if (keys.includes(todayKey)) {
    notes.push(isCancel
      ? '⚠️ 今天的鬧鐘昨晚已經關掉了，要上班的話請自己打開'
      : '⚠️ 今天的鬧鐘昨晚已經設定好了，請自己到時鐘 App 關掉');
  }

  if (keys.includes(tomorrowKey)) {
    if (lastReport === getTodayString()) {
      notes.push(isCancel
        ? '⚠️ 今晚的鬧鐘捷徑已經跑過了，明天的鬧鐘是關的，請自己打開'
        : '⚠️ 今晚的鬧鐘捷徑已經跑過了，明天的鬧鐘還開著，請自己關掉');
    } else {
      notes.push(isCancel
        ? '⏰ 今晚 20:30 捷徑會自動開啟明天的鬧鐘'
        : '⏰ 今晚 20:30 捷徑會自動關閉明天的鬧鐘');
    }
  }

  return notes;
}

function getLeaveUsage() {
  return '請假指令：\n' +
    '• 請假 9/30\n' +
    '• 明天請假\n' +
    '• 請假 9/30,10/1\n' +
    '• 取消請假 9/30\n' +
    '• 請假紀錄';
}

function handleListLeave(user) {
  const keys = getUpcomingLeaveKeys(user.name);
  if (keys.length === 0) {
    return '目前沒有登記請假。\n\n' + getLeaveUsage();
  }

  let reply = '🏖️ 你的請假：\n\n';
  keys.forEach(key => {
    reply += `• ${formatLeaveDate(fromLeaveKey(key))}\n`;
  });
  reply += '\n取消請用：取消請假 9/30';
  return reply;
}

/**
 * 處理所有含「請假」的訊息
 */
function handleLeaveCommand(userId, message) {
  const text = message.trim().replace(/请/g, '請').replace(/[纪记]录/g, '紀錄').replace(/記錄/g, '紀錄');

  const user = getUserInfo(userId);
  if (!user) {
    return '❌ 請先綁定身份！';
  }
  if (user.mode !== '完整') {
    return '請假功能只支援完整模式。\n簡化模式請用：休假日 11/3,11/10';
  }

  if (text === '請假紀錄' || text === '我的請假') {
    return handleListLeave(user);
  }

  const isCancel = text.startsWith('取消');
  const dateText = text.replace(/^取消/, '').replace('請假', '').trim();
  if (!dateText) {
    return getLeaveUsage();
  }

  const dates = parseLeaveDates(dateText);
  if (!dates) {
    return '❌ 看不懂要哪一天\n\n' + getLeaveUsage();
  }

  const keys = getUpcomingLeaveKeys(user.name);
  const changedKeys = dates.map(toLeaveKey);
  if (isCancel && !changedKeys.some(key => keys.includes(key))) {
    return '這些日期沒有登記請假。\n\n' + handleListLeave(user);
  }
  const newKeys = isCancel
    ? keys.filter(key => !changedKeys.includes(key))
    : Array.from(new Set(keys.concat(changedKeys))).sort();
  saveLeaveKeys(user.name, newKeys);

  const syncLimit = startOfToday();
  syncLimit.setDate(syncLimit.getDate() + SYNC_DAYS_AHEAD);
  const inSyncWindow = dates.some(date => date < syncLimit);

  try {
    if (isCancel && inSyncWindow) {
      syncUserScheduleToCalendar(user.name);
    } else if (!isCancel) {
      dates.forEach(date => removeShiftEventFromCalendar(user.name, date));
    }
  } catch (error) {
    Logger.log('⚠️ 請假：更新日曆失敗 ' + error.message);
  }

  let reply = isCancel ? '✅ 已取消請假：\n' : '✅ 已登記請假：\n';
  dates.forEach(date => {
    reply += `• ${formatLeaveDate(date)}\n`;
  });

  const notes = getLeaveAlarmNotes(user.name, dates, isCancel);
  if (notes.length > 0) {
    reply += '\n' + notes.join('\n');
  }

  return reply;
}
