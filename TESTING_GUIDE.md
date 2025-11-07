# 🧪 簡單測試指南

這個指南會教你如何在不依賴 LINE 的情況下測試你的配置。

---

## 📋 第一步：查看執行日誌的方法

### 方法 A：使用執行日誌視窗（推薦）

在 Apps Script 編輯器中：

1. **找到「執行日誌」按鈕**
   - 在畫面**下方**會有一個「執行日誌」的區域
   - 如果沒看到，點擊畫面下方的「執行日誌」標籤

2. **運行函數後**
   - 日誌會自動顯示在下方
   - 不需要額外點擊任何按鈕

### 方法 B：使用左側「執行」頁面

1. 點擊左側的 **⚡「執行」** 圖標（閃電圖標）
2. 會顯示所有執行記錄
3. 點擊任一記錄查看詳細日誌

---

## 🔧 第二步：運行配置診斷測試

### 1. 首先，填入你的 Spreadsheet ID

在 Code.gs 的第 17 行：

```javascript
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
```

改成：

```javascript
const SPREADSHEET_ID = '你的試算表ID';
```

**如何找到試算表 ID？**
- 打開你的 Google Sheets
- 從網址複製 ID：
  ```
  https://docs.google.com/spreadsheets/d/【這一段就是ID】/edit
  ```

### 2. 運行診斷測試

1. 在 Apps Script 編輯器頂部找到函數選擇下拉選單
2. 選擇 **`testConfiguration`**
3. 點擊「執行」按鈕（▶️）
4. 第一次執行時可能需要授權，點擊「審查權限」並授權
5. 查看**畫面下方**的「執行日誌」

### 3. 讀取測試結果

你會看到類似這樣的輸出：

```
========================================
🧪 LINE Bot 配置診斷測試
========================================

【測試 1】檢查 SPREADSHEET_ID
✓ SPREADSHEET_ID 已設置: 1a2b3c...

【測試 2】連接 Google Sheets
✓ 成功連接到試算表
   試算表名稱: 班表系統

【測試 3】檢查工作表結構
✓ 找到工作表: 用戶配置
✓ 找到工作表: 完整班表
✓ 找到工作表: 休息日記錄

【測試 4】讀取班表數據
✓ 成功讀取班表
   資料行數: 28
   資料列數: 60
   找到員工數: 10
   前幾位員工: Jessica, Marjorie, Edo, Linda, Clay

【測試 5】檢查 LINE Channel Access Token
⚠️ 警告：LINE_CHANNEL_ACCESS_TOKEN 尚未設置

========================================
📊 診斷總結
========================================
✅ 基本配置正常！

下一步：
1. 確保已填入 LINE_CHANNEL_ACCESS_TOKEN（第 13 行）
2. 部署為 Web 應用程式
3. 在 LINE Developers Console 設置 Webhook URL
4. 在 LINE 中測試發送：綁定 Sunny
========================================
```

---

## 🧪 第三步：測試綁定功能

如果第二步的診斷測試通過了，現在測試綁定功能：

### 1. 修改測試用戶名稱（可選）

在 Code.gs 找到 `testBindUser` 函數（大約第 188 行）：

```javascript
const testUserName = 'Sunny';  // 👈 修改這裡為你的名字
```

把 `'Sunny'` 改成你的名字。

### 2. 運行測試

1. 在函數選擇下拉選單中選擇 **`testBindUser`**
2. 點擊「執行」按鈕（▶️）
3. 查看畫面下方的執行日誌

### 3. 檢查結果

你會看到：

```
========================================
🧪 測試綁定功能
========================================
測試用戶名稱: Sunny

✅ 綁定功能執行完成

回覆訊息：
---
✅ 綁定成功！

👤 姓名：Sunny
📊 模式：完整模式

你的名字已在完整班表中找到，系統會為你提供：
  ✓ 完整的班表查詢
  ✓ 同班人員查詢
  ✓ 自動通知功能

輸入「幫助」查看所有可用命令。
---

請檢查「用戶配置」工作表，應該會看到新增的記錄
========================================
```

然後：
4. 打開你的 Google Sheets
5. 前往「用戶配置」工作表
6. 應該會看到一行新記錄：
   - User ID: `TEST_USER_12345`
   - 姓名: `Sunny`
   - 模式: `完整`

---

## ❌ 如果測試失敗

### 錯誤：SPREADSHEET_ID 尚未設置

**解決：** 填入你的 Spreadsheet ID（第 17 行）

### 錯誤：無法連接到試算表

**可能原因：**
1. SPREADSHEET_ID 錯誤
2. 試算表不存在
3. 沒有權限訪問

**解決：**
1. 確認 SPREADSHEET_ID 是否正確
2. 確認試算表存在且你有訪問權限

### 錯誤：缺少工作表

**解決：**
確保你的 Google Sheets 有這些 Tab：
- 用戶配置
- 完整班表
- 休息日記錄

---

## ✅ 測試都通過了？

太好了！現在可以繼續配置 LINE Bot：

### 1. 填入 LINE Channel Access Token

在 Code.gs 第 13 行：

```javascript
const LINE_CHANNEL_ACCESS_TOKEN = 'YOUR_CHANNEL_ACCESS_TOKEN_HERE';
```

改成你的實際 Token（從 LINE Developers Console 獲取）

### 2. 部署為 Web 應用程式

1. 點擊「部署」→「新增部署」
2. 選擇「網頁應用程式」
3. **執行身分：我**
4. **誰可以存取：任何人**（重要！）
5. 點擊「部署」
6. 複製 Web 應用程式 URL

### 3. 設定 LINE Webhook

1. 前往 [LINE Developers Console](https://developers.line.biz/console/)
2. 選擇你的 Channel → Messaging API
3. 填入 Webhook URL（剛複製的 URL）
4. 開啟「Use webhook」
5. 點擊「Verify」

### 4. 在 LINE 中測試

向你的 Bot 發送：`綁定 Sunny`

---

## 🆘 還是有問題？

如果測試函數都通過了，但 LINE Bot 還是不能用：

1. 確認 Webhook URL 設置正確
2. 確認「Use webhook」已開啟
3. 確認「Auto-reply messages」已關閉
4. 嘗試重新部署（創建新版本）

如果測試函數失敗了：

1. 複製完整的錯誤訊息
2. 檢查是否所有配置都正確
3. 確認 Google Sheets 結構正確

---

## 📸 看不懂文字說明？

如果你需要截圖指導，請告訴我：
1. 你卡在哪一步
2. 你看到什麼錯誤訊息
3. 你的畫面是什麼樣子

我會提供更詳細的指導！
