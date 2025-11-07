# LINE Bot Webhook 連接問題排查指南

## 🔴 常見錯誤診斷

### 錯誤 A：`e 參數是 undefined`

**原因：** 你在 Apps Script 編輯器中手動運行了 `doPost()` 函數

**解決方法：**
1. ❌ **不要**在 Apps Script 編輯器中點擊「執行」按鈕來運行 `doPost()`
2. ✅ **正確做法**：
   - 確保已經部署為 Web 應用程式
   - 在 LINE 中向 Bot 發送訊息來測試
   - 或者在瀏覽器中訪問 Web App URL（會調用 `doGet()`）

**重要：** `doPost()` 函數只能由 LINE 平台通過 Webhook 調用，不能手動運行！

---

### 錯誤 B：`e.postData is undefined`

**原因：** LINE 沒有正確地向你的 Webhook 發送 POST 請求

**解決方法：** 請按照下面的「解決步驟」進行檢查

---

## ✅ 解決步驟

### 步驟 1：重新部署 Apps Script

1. 打開你的 Google Apps Script 編輯器
2. 點擊右上角的「部署」→「管理部署」
3. 點擊現有部署旁邊的 ✏️（編輯）
4. 在「版本」下拉選單中選擇「新版本」
5. 點擊「部署」
6. **複製新的 Web 應用程式 URL**（格式：`https://script.google.com/macros/s/xxxxx/exec`）

⚠️ **重要**：每次修改代碼後都必須創建新版本並重新部署！

---

### 步驟 2：測試 Web App URL

1. 在瀏覽器中直接打開你剛複製的 Web App URL
2. 你應該會看到：

```
✅ LINE Bot Webhook 正常運行
時間：2025-11-08 ...
如果你看到這個頁面，表示 Web App 部署成功。
請確認 LINE Developers Console 中的 Webhook URL 設置正確。
```

3. **如果看不到這個頁面**，說明部署有問題，請重新執行步驟 1

---

### 步驟 3：配置 LINE Developers Console

1. 前往 [LINE Developers Console](https://developers.line.biz/console/)
2. 選擇你的 Provider → 選擇你的 Channel
3. 前往「Messaging API」頁籤
4. 找到「Webhook settings」區域

#### 檢查清單：

- [ ] **Webhook URL** 已設置（填入步驟 1 複製的 URL）
- [ ] **Use webhook** 開關已開啟（ON）
- [ ] 點擊「Verify」按鈕測試連接
  - ✅ 應該顯示「Success」
  - ❌ 如果顯示失敗，請檢查 URL 是否正確

5. 在同一頁面下方找到「LINE Official Account features」
- [ ] **Auto-reply messages** 設為 **Disabled**（關閉）
- [ ] **Greeting messages** 可以保持 Enabled 或 Disabled
- [ ] **Webhooks** 設為 **Enabled**（開啟）

---

### 步驟 4：配置 Channel Access Token

1. 在「Messaging API」頁籤中，找到「Channel access token」
2. 如果沒有 token，點擊「Issue」按鈕創建一個
3. **複製這個 token**
4. 打開你的 Apps Script 編輯器
5. 找到第 13 行：
```javascript
const LINE_CHANNEL_ACCESS_TOKEN = 'YOUR_CHANNEL_ACCESS_TOKEN_HERE';
```
6. 將 `YOUR_CHANNEL_ACCESS_TOKEN_HERE` 替換為你複製的 token
7. **保存並重新部署**（重複步驟 1）

---

### 步驟 5：配置 Spreadsheet ID

1. 打開你的 Google Sheets
2. 從網址複製 Spreadsheet ID：
```
https://docs.google.com/spreadsheets/d/【這一段就是 ID】/edit
```

3. 在 Apps Script 編輯器中找到第 17 行：
```javascript
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
```

4. 將 `YOUR_SPREADSHEET_ID_HERE` 替換為你複製的 ID
5. **保存並重新部署**（重複步驟 1）

---

### 步驟 6：測試機器人

1. 在 LINE 中向你的 Bot 發送：`綁定 Sunny`
2. 如果成功，你應該會收到回覆
3. 如果失敗，前往 Apps Script 編輯器 → 左側「執行」頁籤
4. 查看執行日誌，找到最新的錯誤訊息

---

## 🔍 進階除錯

### 查看執行日誌

1. 在 Apps Script 編輯器中
2. 點擊左側的「執行」（一個播放按鈕的圖標）
3. 查看最近的執行記錄
4. 點擊任何執行記錄查看詳細日誌

### 應該看到的日誌（正常情況）：

```
收到 Webhook 請求
postData: {"events":[...]}
事件數量: 1
事件類型: message
處理文字訊息: 綁定 Sunny
```

### 常見錯誤及解決方法：

#### 錯誤 1：`e.postData is undefined`
- **原因**：LINE 沒有正確調用你的 Webhook
- **解決**：檢查步驟 2 和步驟 3

#### 錯誤 2：`Cannot read properties of null (reading 'getSheetByName')`
- **原因**：SPREADSHEET_ID 未設置或錯誤
- **解決**：檢查步驟 5

#### 錯誤 3：無執行記錄
- **原因**：Webhook URL 設置錯誤
- **解決**：檢查步驟 1 和步驟 3

#### 錯誤 4：驗證失敗
- **原因**：部署時沒有選擇「所有人」都可以訪問
- **解決**：重新部署，在「誰可以存取」選擇「任何人」

---

## 📋 完整檢查清單

複製這個清單，逐項確認：

```
部署檢查：
[ ] 已修改代碼中的 LINE_CHANNEL_ACCESS_TOKEN
[ ] 已修改代碼中的 SPREADSHEET_ID
[ ] 已保存代碼
[ ] 已點擊「部署」→「管理部署」
[ ] 已創建「新版本」
[ ] 已複製新的 Web App URL

LINE 配置檢查：
[ ] Webhook URL 已填入（結尾是 /exec）
[ ] Use webhook 已開啟（ON）
[ ] Webhook 驗證顯示「Success」
[ ] Auto-reply messages 已關閉（Disabled）
[ ] Webhooks 功能已啟用（Enabled）

測試檢查：
[ ] 在瀏覽器打開 Web App URL 能看到狀態頁面
[ ] 向 Bot 發送訊息有回應
[ ] Apps Script 執行日誌中有記錄
```

---

## 💡 提示

1. **每次修改代碼都要重新部署！**
2. **部署時記得選擇「新版本」！**
3. **確保「誰可以存取」選擇「任何人」！**
4. **Webhook URL 必須以 `/exec` 結尾！**
5. **如果還是不行，嘗試建立全新的部署（而不是更新現有的）**

---

## 🆘 還是不行？

如果完成以上所有步驟仍然無法運作，請提供以下資訊：

1. Apps Script 執行日誌的截圖
2. LINE Developers Console Webhook 設置的截圖
3. 在瀏覽器訪問 Web App URL 的結果截圖
4. 確認是否完成了所有檢查清單項目

這樣我才能更準確地幫你診斷問題！
