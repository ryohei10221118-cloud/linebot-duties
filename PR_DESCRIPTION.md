# LINE Bot 班表查詢系統 - 完整實現

## 📋 摘要

實現了一個基於 Google Apps Script 的 LINE Bot 班表查詢系統，支援自動通知、智能班別分類，以及雙模式（完整班表 + 簡化休息日）。

## ✨ 主要功能

### 1. 智能班別分類系統
- ✅ 正確將 N1/N2/N3/N 歸類為夜班
- ✅ 正確將 M1/M2/M3/M 歸類為早班
- ✅ 正確將 A1/A2/A 歸類為中班
- ✅ 支援休息日、休假、病假、出差等特殊狀態

### 2. 雙模式支援
- **完整模式**：適合有完整班表的用戶
  - 查詢明天班別
  - 查詢本週班表
  - 查詢同班人員（自動檢測所有相同班別類型的人）

- **簡化模式**：適合懶人用戶
  - 只需設置休息日
  - 自動判斷是否上班
  - 每月只需 30 秒維護

### 3. 自動模式檢測
- ✅ 系統自動檢查用戶是否在完整班表中
- ✅ 自動判斷使用完整模式或簡化模式
- ✅ 用戶只需輸入：`綁定 姓名`

### 4. 智能同班人員檢測
- ✅ 不依賴固定組別配置
- ✅ 自動從班表標題行讀取所有員工
- ✅ 根據實際班別類型（早/中/晚）查找同班人員
- ✅ 支援每月同班人員變動

### 5. 自動定時通知
- ✅ 早上 9:00 通知夜班人員
- ✅ 晚上 9:00 通知早班/中班人員
- ✅ 根據班別類型智能推送

### 6. 繁體中文介面
- ✅ 所有訊息和回覆都使用繁體中文
- ✅ 使用者友善的命令格式

## 🔧 技術改進

### LINE Webhook 修復
- ✅ 將 `ContentService` 替換為 `HtmlService`
- ✅ 修復 LINE Webhook 驗證失敗問題

### 程式碼優化
- ✅ 移除對固定組別的依賴
- ✅ 新增 `getAllEmployees()` 函數動態讀取員工名單
- ✅ 優化同班人員查詢邏輯

## 📦 包含檔案

```
google-apps-script/
├── Code.gs                   # 完整的 Apps Script 代碼（繁體中文）
├── DeployGuide.md            # 詳細部署教程
├── GoogleSheetsSetup.md      # Google Sheets 設置指南
├── LazyModeGuide.md          # 簡化模式使用指南
└── README.md                 # 系統總覽

shift_classifier.py           # Python 版本的班別分類器（測試用）
schedule_parser.py            # Python 版本的班表解析器（測試用）
requirements.txt              # Python 依賴
```

## 🎯 使用方式

### 用戶綁定
```
綁定 Sunny
```
系統自動判斷模式

### 完整模式命令
```
明天上班嗎
本週班表
同班人員
```

### 簡化模式命令
```
休息日 11/3,11/10,11/17
明天上班嗎
本月休息日
```

## 📊 Google Sheets 結構

只需要 3 個 Tab：
1. **用戶配置**：系統自動記錄
2. **完整班表**：每月更新班表數據
3. **休息日記錄**：簡化模式用戶使用

## ✅ 測試狀態

- ✅ 班別分類測試通過
- ✅ LINE Webhook 驗證修復
- ✅ 自動模式檢測功能正常
- ✅ 同班人員查詢邏輯優化完成

## 🚀 部署方式

詳見 `google-apps-script/DeployGuide.md`

預計部署時間：30 分鐘

## 💡 設計特色

1. **完全免費**：使用 Google Apps Script，無需服務器
2. **零維護**：直接在 Google Sheets 更新數據，立即生效
3. **懶人友好**：簡化模式每月只需 30 秒
4. **靈活智能**：自動檢測模式，自動查找同班人員

## 📝 Commit 歷史

- Fix shift classification: N1/N2/N3 正確歸類
- Add Google Apps Script 完整解決方案
- Convert to Traditional Chinese
- Update coworker detection（不依賴固定組別）
- Fix LINE Webhook verification
- Add automatic mode detection

---

**這個 PR 提供了一個完整、可用、維護友好的 LINE Bot 班表查詢系統！** 🎉
