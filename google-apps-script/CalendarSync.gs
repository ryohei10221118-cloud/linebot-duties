/**
 * ==================== Google 日曆同步功能 ====================
 * 自動將班表同步到 Google 日曆，配合 iOS 捷徑實現智慧鬧鐘
 */

// 日曆設定
const CALENDAR_NAME = '班表通知'; // 日曆名稱
const SYNC_DAYS_AHEAD = 30; // 同步未來幾天的班表

// 班別顏色設定（Google Calendar 顏色 ID）
const SHIFT_COLORS = {
  '早班': CalendarApp.EventColor.PALE_RED,      // 淺紅色
  '中班': CalendarApp.EventColor.PALE_BLUE,     // 淺藍色
  '夜班': CalendarApp.EventColor.PURPLE,        // 紫色
  '休假': null  // 休假不建立事件
};

/**
 * 取得或建立班表日曆
 */
function getOrCreateScheduleCalendar() {
  // 先檢查是否已有同名日曆
  const calendars = CalendarApp.getCalendarsByName(CALENDAR_NAME);

  if (calendars.length > 0) {
    Logger.log('✓ 找到現有日曆：' + CALENDAR_NAME);
    return calendars[0];
  }

  // 建立新日曆
  Logger.log('📅 建立新日曆：' + CALENDAR_NAME);
  const calendar = CalendarApp.createCalendar(CALENDAR_NAME, {
    summary: '自動同步的班表資訊，用於智慧鬧鐘控制',
    color: CalendarApp.Color.BLUE
  });

  return calendar;
}

/**
 * 同步單一用戶的班表到 Google 日曆
 * @param {string} userName - 用戶姓名
 * @param {number} daysAhead - 同步未來幾天（預設 30 天）
 */
function syncUserScheduleToCalendar(userName, daysAhead = SYNC_DAYS_AHEAD) {
  try {
    Logger.log('');
    Logger.log('========================================');
    Logger.log('🔄 開始同步班表到 Google 日曆');
    Logger.log('用戶：' + userName);
    Logger.log('========================================');

    // 取得日曆
    const calendar = getOrCreateScheduleCalendar();

    // 清除該用戶的舊事件（未來 daysAhead 天）
    const now = new Date();
    const endDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    Logger.log('清除舊事件：' + now.toLocaleDateString() + ' ~ ' + endDate.toLocaleDateString());
    const oldEvents = calendar.getEvents(now, endDate);
    let deletedCount = 0;

    oldEvents.forEach(event => {
      if (event.getTitle().includes(userName)) {
        event.deleteEvent();
        deletedCount++;
      }
    });

    if (deletedCount > 0) {
      Logger.log('✓ 已清除 ' + deletedCount + ' 個舊事件');
    }

    // 建立新事件
    let createdCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < daysAhead; i++) {
      const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const shift = getShiftForDate(userName, date);

      if (!shift) {
        continue; // 沒有班表資料
      }

      // 判斷班別類型
      let shiftType = null;
      let shiftCode = '';

      if (shift.includes('休假') || shift.includes('特休') || shift.includes('病假')) {
        // 休假日不建立事件
        skippedCount++;
        continue;
      } else if (shift.includes('夜班')) {
        shiftType = '夜班';
        shiftCode = shift.replace('🌙 夜班 ', '');
      } else if (shift.includes('早班')) {
        shiftType = '早班';
        shiftCode = shift.replace('🌅 早班 ', '');
      } else if (shift.includes('中班')) {
        shiftType = '中班';
        shiftCode = shift.replace('🌤️ 中班 ', '');
      } else {
        // 其他類型的班別
        skippedCount++;
        continue;
      }

      // 建立事件
      const eventTitle = `${userName} - ${shiftType} ${shiftCode}`;
      const eventStart = new Date(date);
      eventStart.setHours(0, 0, 0, 0); // 設定為當天 00:00

      const eventEnd = new Date(date);
      eventEnd.setHours(23, 59, 59, 999); // 設定為當天 23:59

      const event = calendar.createAllDayEvent(eventTitle, date, {
        description: `班別：${shift}\n\n自動同步自班表系統\n更新時間：${new Date().toLocaleString('zh-TW')}`
      });

      // 設定顏色
      if (SHIFT_COLORS[shiftType]) {
        event.setColor(SHIFT_COLORS[shiftType]);
      }

      createdCount++;
    }

    Logger.log('');
    Logger.log('✅ 同步完成！');
    Logger.log('  建立事件：' + createdCount + ' 個');
    Logger.log('  跳過休假：' + skippedCount + ' 天');
    Logger.log('========================================');

    return {
      success: true,
      created: createdCount,
      skipped: skippedCount,
      deleted: deletedCount
    };

  } catch (error) {
    Logger.log('');
    Logger.log('❌ 同步失敗');
    Logger.log('錯誤訊息：' + error.message);
    Logger.log('錯誤堆疊：' + error.stack);
    Logger.log('========================================');

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 同步所有用戶的班表到 Google 日曆
 * 這個函數可以設定為每天自動執行
 */
function syncAllUsersScheduleToCalendar() {
  Logger.log('========================================');
  Logger.log('🔄 開始同步所有用戶班表');
  Logger.log('時間：' + new Date().toLocaleString('zh-TW'));
  Logger.log('========================================');

  try {
    // 取得所有員工
    const allEmployees = getAllEmployees();

    if (allEmployees.length === 0) {
      Logger.log('⚠️ 沒有找到任何員工');
      return;
    }

    Logger.log('找到 ' + allEmployees.length + ' 位員工');
    Logger.log('');

    let successCount = 0;
    let failCount = 0;

    // 為每位員工同步班表
    allEmployees.forEach((employee, index) => {
      Logger.log((index + 1) + '/' + allEmployees.length + ': ' + employee);
      const result = syncUserScheduleToCalendar(employee);

      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }

      // 避免超過 Google API 配額，每位員工之間暫停 1 秒
      if (index < allEmployees.length - 1) {
        Utilities.sleep(1000);
      }
    });

    Logger.log('');
    Logger.log('========================================');
    Logger.log('✅ 全部同步完成！');
    Logger.log('  成功：' + successCount + ' 位');
    Logger.log('  失敗：' + failCount + ' 位');
    Logger.log('========================================');

  } catch (error) {
    Logger.log('');
    Logger.log('❌ 同步失敗');
    Logger.log('錯誤訊息：' + error.message);
    Logger.log('錯誤堆疊：' + error.stack);
    Logger.log('========================================');
  }
}

/**
 * 🧪 測試日曆同步功能
 *
 * 使用方法：
 * 1. 修改下面的 testUserName 為你的名字
 * 2. 選擇 "testCalendarSync" 函數
 * 3. 點擊「執行」
 * 4. 第一次執行時會要求授權存取 Google Calendar
 * 5. 查看執行日誌
 * 6. 開啟 Google 日曆確認是否成功建立事件
 */
function testCalendarSync() {
  // 👇 修改這裡為你要測試的用戶名稱
  const testUserName = 'Ricky';  // 改成你的名字

  Logger.log('🧪 測試日曆同步功能');
  Logger.log('測試用戶：' + testUserName);
  Logger.log('');

  // 執行同步
  syncUserScheduleToCalendar(testUserName, 14);  // 同步未來 14 天

  Logger.log('');
  Logger.log('📱 下一步：');
  Logger.log('1. 打開 Google 日曆（https://calendar.google.com）');
  Logger.log('2. 在左側找到「' + CALENDAR_NAME + '」日曆');
  Logger.log('3. 確認是否有你的班表事件');
  Logger.log('4. 不同班別會用不同顏色標示：');
  Logger.log('   - 早班：淺紅色');
  Logger.log('   - 中班：淺藍色');
  Logger.log('   - 夜班：紫色');
  Logger.log('   - 休假：不顯示');
}

/**
 * 設定每日自動同步
 *
 * 使用方法：
 * 1. 執行一次這個函數
 * 2. 系統會自動建立每天凌晨 2:00 的定時觸發器
 * 3. 之後每天都會自動同步班表到日曆
 */
function setupDailyCalendarSync() {
  Logger.log('設定每日自動同步...');

  // 先刪除舊的觸發器（避免重複）
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'syncAllUsersScheduleToCalendar') {
      ScriptApp.deleteTrigger(trigger);
      Logger.log('✓ 已刪除舊的觸發器');
    }
  });

  // 建立新的每日觸發器（每天凌晨 2:00 執行）
  ScriptApp.newTrigger('syncAllUsersScheduleToCalendar')
    .timeBased()
    .atHour(2)
    .everyDays(1)
    .create();

  Logger.log('✅ 已設定每日自動同步！');
  Logger.log('執行時間：每天凌晨 2:00');
  Logger.log('');
  Logger.log('你可以在「觸發條件」頁面查看和管理觸發器：');
  Logger.log('左側選單 → 觸發條件（時鐘圖示）');
}

/**
 * LINE Bot 命令：同步日曆
 * 讓用戶可以透過 LINE 手動觸發日曆同步
 */
function handleSyncCalendar(userId) {
  const user = getUserInfo(userId);
  if (!user) {
    return '❌ 請先綁定身份！';
  }

  if (user.mode === '簡化') {
    return '⚠️ 簡化模式暫不支援日曆同步功能。';
  }

  // 執行同步
  Logger.log('用戶 ' + user.name + ' 請求同步日曆');
  const result = syncUserScheduleToCalendar(user.name, 30);

  if (result.success) {
    let reply = '✅ 日曆同步完成！\n\n';
    reply += `📅 已同步未來 30 天班表\n`;
    reply += `✓ 建立事件：${result.created} 個\n`;
    reply += `✓ 跳過休假：${result.skipped} 天\n\n`;
    reply += `請到 Google 日曆查看「${CALENDAR_NAME}」\n`;
    reply += `https://calendar.google.com`;
    return reply;
  } else {
    return '❌ 同步失敗：' + result.error;
  }
}
