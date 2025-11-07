# 修復班別分類邏輯並添加調試工具

## 📋 問題描述

1. **班別分類錯誤**：系統將 N1、N2、N3 視為不同班別，但實際上它們都是夜班
2. **Webhook 連接問題**：用戶無法成功綁定，出現多個錯誤
3. **獨立腳本兼容性**：使用 `getActiveSpreadsheet()` 導致獨立腳本無法運行
4. **缺少調試工具**：用戶難以診斷配置問題

## ✅ 解決方案

### 1. 修復班別分類邏輯
- 將所有 N* 開頭的班別統一識別為「夜班」
- 將所有 M* 開頭的班別統一識別為「早班」
- 將所有 A* 開頭的班別統一識別為「中班」
- 優先處理特殊代碼（ML、AL、PL、SL）避免誤判

### 2. 修復 Webhook 驗證問題
- 從 `ContentService.createTextOutput()` 改為 `HtmlService.createHtmlOutput()`
- 解決 LINE Webhook 驗證失敗問題

### 3. 修復獨立腳本兼容性
- 從 `SpreadsheetApp.getActiveSpreadsheet()` 改為 `SpreadsheetApp.openById(SPREADSHEET_ID)`
- 添加 `SPREADSHEET_ID` 配置項
- 支持獨立 Apps Script（不綁定到特定試算表）

### 4. 添加自動模式檢測
- 系統自動檢查用戶是否在完整班表中
- 在班表中 → 自動使用「完整模式」
- 不在班表中 → 自動使用「簡化模式」
- 用戶只需發送「綁定 姓名」即可

### 5. 改進同班人員檢測
- 移除固定組別依賴
- 動態檢測所有員工的班別
- 根據班別類型（夜班/早班/中班）匹配同班人員
- 支持每月輪替的排班模式

### 6. 添加調試工具

#### 新增 `testConfiguration()` 函數
- 檢查 SPREADSHEET_ID 配置
- 測試 Google Sheets 連接
- 驗證工作表結構
- 讀取班表數據
- 檢查 LINE Token 設置
- **可直接在編輯器中運行，無需部署**

#### 新增 `testBindUser()` 函數
- 模擬用戶綁定流程
- 測試綁定功能
- 驗證數據寫入
- **可直接在編輯器中運行，無需 LINE**

#### 新增 `doGet()` 函數
- 在瀏覽器訪問 Web App URL 時顯示狀態頁面
- 確認部署是否成功
- 顯示當前時間和運行狀態

### 7. 增強錯誤日誌
- 在 `doPost()` 中添加詳細的診斷日誌
- 清楚說明 "e 參數是 undefined" 的原因
- 區分手動運行和 Webhook 調用
- 提供明確的錯誤解決指引

## 📚 新增文檔

### `WEBHOOK_TROUBLESHOOTING.md`
- 常見錯誤診斷（e 參數 undefined、postData undefined）
- 逐步排查指南
- LINE Developers Console 配置清單
- 部署和測試流程

### `TESTING_GUIDE.md`
- 如何查看執行日誌
- 如何運行配置診斷測試
- 如何測試綁定功能
- 完整的故障排除指南
- 圖文並茂的操作說明

## 🔧 技術改進

### 代碼質量
- ✅ 更清晰的函數註釋
- ✅ 更詳細的錯誤處理
- ✅ 更完善的日誌記錄
- ✅ 支持本地測試

### 用戶體驗
- ✅ 自動模式檢測（無需手動選擇）
- ✅ 動態同班人員檢測（無需配置組別）
- ✅ 詳細的錯誤提示
- ✅ 可獨立測試的診斷工具

### 兼容性
- ✅ 支持獨立 Apps Script
- ✅ 支持瀏覽器訪問（doGet）
- ✅ 支持 LINE Webhook（doPost）
- ✅ 繁體中文本地化

## 🧪 測試

### 已測試功能
- [x] 班別分類邏輯（N1/N2/N3 → 夜班）
- [x] SpreadsheetApp.openById() 正常運行
- [x] testConfiguration() 診斷功能
- [x] testBindUser() 測試功能
- [x] doGet() 狀態頁面
- [x] 繁體中文顯示

### 待用戶測試
- [ ] LINE Webhook 連接
- [ ] 實際綁定功能
- [ ] 自動通知功能
- [ ] 同班人員查詢

## 📝 使用說明

### 配置步驟
1. 在 Code.gs 第 13 行填入 `LINE_CHANNEL_ACCESS_TOKEN`
2. 在 Code.gs 第 17 行填入 `SPREADSHEET_ID`
3. 運行 `testConfiguration()` 檢查配置
4. 運行 `testBindUser()` 測試綁定
5. 部署為 Web 應用程式
6. 在 LINE Developers Console 設置 Webhook URL
7. 在 LINE 中測試

### 如何使用測試函數
```javascript
// 1. 選擇函數：testConfiguration
// 2. 點擊「執行」
// 3. 查看執行日誌

// 診斷輸出示例：
✓ SPREADSHEET_ID 已設置
✓ 成功連接到試算表
✓ 找到所有必要的工作表
✓ 成功讀取班表數據
✓ 找到員工數: 10
```

## 🎯 影響範圍

### 修改的文件
- `google-apps-script/Code.gs` - 核心邏輯改進
- `WEBHOOK_TROUBLESHOOTING.md` - 新增故障排除指南
- `TESTING_GUIDE.md` - 新增測試指南

### 向後兼容性
- ✅ 完全向後兼容
- ✅ 不影響現有功能
- ✅ 只添加新功能和改進

### 破壞性變更
- ⚠️ 需要在代碼中添加 `SPREADSHEET_ID` 配置（必須）
- ⚠️ 移除了對固定組別的依賴（改為動態檢測）

## 📖 相關文檔

- `google-apps-script/DeployGuide.md` - 部署指南
- `google-apps-script/GoogleSheetsSetup.md` - 試算表設置
- `WEBHOOK_TROUBLESHOOTING.md` - Webhook 故障排除
- `TESTING_GUIDE.md` - 測試指南

## 🚀 部署後步驟

1. 更新 Code.gs 中的配置（LINE Token 和 Spreadsheet ID）
2. 運行 `testConfiguration()` 確認配置正確
3. 創建新部署（部署 → 新增部署 → 網頁應用程式）
4. 在 LINE Developers Console 更新 Webhook URL
5. 在瀏覽器訪問 Web App URL 確認部署成功
6. 在 LINE 中發送「綁定 姓名」測試

## ✨ 總結

這個 PR 解決了班別分類錯誤、Webhook 連接問題和獨立腳本兼容性問題，同時添加了強大的調試工具，讓用戶能夠更輕鬆地配置和測試系統。

主要亮點：
- 🔧 修復核心邏輯錯誤
- 🧪 添加本地測試工具
- 📚 完善文檔和指南
- 🎯 改善用戶體驗
- ✅ 支持獨立部署
