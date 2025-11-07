/**
 * 綁定用戶 - 調試版本
 * 格式：綁定 姓名
 * 系統會自動檢查是否在完整班表中，來決定使用哪種模式
 */
function handleBindUser(userId, message) {
  try {
    Logger.log('=== 開始綁定流程 ===');
    Logger.log('原始訊息: ' + message);

    const name = message.replace('綁定 ', '').trim();
    Logger.log('解析出的姓名: ' + name);

    // 檢查是否在完整班表中
    Logger.log('正在獲取所有員工...');
    const allEmployees = getAllEmployees();
    Logger.log('所有員工: ' + allEmployees);
    Logger.log('員工數量: ' + allEmployees.length);

    const isInSchedule = allEmployees.includes(name);
    Logger.log('是否在班表中: ' + isInSchedule);

    // 自動判斷模式
    const mode = isInSchedule ? '完整' : '簡化';
    Logger.log('判斷模式: ' + mode);

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_USERS);
    Logger.log('獲取用戶配置 Sheet: ' + (sheet ? '成功' : '失敗'));

    // 檢查是否已經綁定
    const data = sheet.getDataRange().getValues();
    Logger.log('用戶配置資料行數: ' + data.length);

    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        // 更新現有記錄
        sheet.getRange(i + 1, 2, 1, 3).setValues([[name, mode, '']]);
        found = true;
        Logger.log('更新現有綁定');
        break;
      }
    }

    if (!found) {
      // 新增記錄
      sheet.appendRow([userId, name, mode, '']);
      Logger.log('新增綁定記錄');
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

    Logger.log('準備回覆: ' + reply);
    Logger.log('=== 綁定流程結束 ===');

    return reply;

  } catch (error) {
    Logger.log('!!! 錯誤發生 !!!');
    Logger.log('錯誤訊息: ' + error);
    Logger.log('錯誤堆疊: ' + error.stack);
    return '❌ 系統錯誤：' + error.toString() + '\n請檢查 Apps Script 執行日誌。';
  }
}
