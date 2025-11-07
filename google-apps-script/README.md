# LINE Bot 班表查询系统 - Google Apps Script 版本

## 📖 简介

这是一个基于 Google Apps Script 的 LINE Bot 班表查询系统，支持：

- 🌙 **智能班别分类**：自动识别 N1/N2/N3（夜班）、M1/M2/M3（早班）、A1/A2（中班）
- 📱 **双模式支持**：完整班表模式 + 简化休息日模式
- ⏰ **自动通知**：每天早上 9 点和晚上 9 点自动推送
- 👥 **多公司支持**：两个不同公司可以共用一个 Bot，数据完全独立
- 💰 **完全免费**：使用 Google Apps Script，无需服务器

---

## 🚀 快速开始

### 📚 文档索引

| 文档 | 说明 | 适用人群 |
|------|------|----------|
| [GoogleSheetsSetup.md](./GoogleSheetsSetup.md) | 如何设置 Google Sheets | 管理员 |
| [DeployGuide.md](./DeployGuide.md) | 完整部署教程 | 管理员 |
| [LazyModeGuide.md](./LazyModeGuide.md) | 懒人模式使用指南 | 简化模式用户 |
| [Code.gs](./Code.gs) | Google Apps Script 源代码 | 开发者 |

### ⚡ 快速部署（30 分钟）

```
1. 设置 Google Sheets     → GoogleSheetsSetup.md
2. 部署 Apps Script       → DeployGuide.md
3. 邀请用户使用           → LazyModeGuide.md
```

---

## ✨ 功能特点

### 完整模式（适合复杂班表）

✅ 支持复杂班别（N1/N2/N3, M1/M2/M3, A1/A2）
✅ 查询明天班别和同班人员
✅ 查询本周班表
✅ 自动通知（根据班别类型智能推送）
✅ 组别管理（M1组、N1组等）

**使用场景：**
- 医院护士排班
- 工厂轮班制
- 需要知道同班人员的场合

### 简化模式（适合懒人）

✅ 只需设置休息日
✅ 自动判断是否上班
✅ 每天自动通知
✅ 每月只需 30 秒维护

**使用场景：**
- 只关心上班与否
- 不需要知道具体班别
- 班表简单的用户

---

## 🏗️ 系统架构

```
LINE Bot
    ↓
Google Apps Script
    ↓
Google Sheets (数据存储)
    ├── Tab 1: 用户配置
    ├── Tab 2: 完整班表
    ├── Tab 3: 组别配置
    └── Tab 4: 休息日记录
```

### 工作流程

```
用户发送消息
    ↓
LINE Webhook → Apps Script doPost()
    ↓
处理命令 → 读取 Google Sheets
    ↓
回复消息 → LINE Reply API

定时任务
    ↓
Apps Script 触发器
    ↓
读取 Google Sheets → 生成通知
    ↓
推送消息 → LINE Push API
```

---

## 📋 支持的班别代码

| 代码 | 分类 | emoji | 说明 |
|------|------|-------|------|
| N, N1, N2, N3 | 夜班 | 🌙 | 所有 N 开头 |
| M, M1, M2, M3 | 早班 | 🌅 | 所有 M 开头 |
| A, A1, A2 | 中班 | 🌤️ | 所有 A 开头 |
| O | 休息 | 😴 | Off day |
| P | 休假 | 🏖️ | Personal leave |
| SL | 病假 | 🤒 | Sick leave |
| ML, AL, PL | 休假 | 🏖️ | 其他休假 |
| BTD | 出差 | ✈️ | Business trip |

---

## 🤖 用户命令

### 通用命令

```
绑定 [姓名] [组别]    - 绑定身份（完整模式）
绑定 [姓名]           - 绑定身份（简化模式）
帮助                  - 显示帮助信息
```

### 完整模式命令

```
明天上班吗            - 查询明天班别
本周班表              - 查询本周班表
同班人员              - 查询明天同班人员
```

### 简化模式命令

```
休息日 11/3,11/10     - 设置休息日
明天上班吗            - 查询是否上班
本月休息日            - 查看已设置的休息日
```

---

## ⏰ 自动通知规则

### 早上 9:00 通知

**对象：** 所有用户

**完整模式：**
- 如果今天是**夜班**，发送通知

**简化模式：**
- 发送今天是否上班

### 晚上 21:00 通知

**对象：** 所有用户

**完整模式：**
- 如果明天是**早班**或**中班**，发送通知
- 如果明天是休息日，也发送通知

**简化模式：**
- 发送明天是否上班

---

## 🔧 配置说明

### LINE Bot 配置

在 `Code.gs` 的第 11 行：

```javascript
const LINE_CHANNEL_ACCESS_TOKEN = 'YOUR_CHANNEL_ACCESS_TOKEN_HERE';
```

### Google Sheets Tab 名称

在 `Code.gs` 的第 14-17 行：

```javascript
const SHEET_USERS = '用户配置';
const SHEET_SCHEDULE = '完整班表';
const SHEET_GROUPS = '组别配置';
const SHEET_HOLIDAYS = '休息日记录';
```

如果你的 Tab 名称不同，请修改这些配置。

---

## 📊 数据格式

### 用户配置 Tab

| LINE User ID | 姓名 | 模式 | 组别 |
|--------------|------|------|------|
| Uxxxx123 | Jessica | 完整 | M1组 |
| Uxxxx456 | John | 简化 | |

### 完整班表 Tab

| 日期 | Jessica | Sam | Marjorie |
|------|---------|-----|----------|
| 11/1 | M1 | N2 | M3 |
| 11/2 | M2 | N1 | M1 |
| 11/3 | O | N3 | O |

### 组别配置 Tab

| 组别 | 成员列表 |
|------|----------|
| M1组 | Jessica,Marjorie,Edo,Linda |
| N1组 | Sam,You,Sunny,Jim |

### 休息日记录 Tab

| 姓名 | 休息日列表 |
|------|------------|
| John | 2024-11-03,2024-11-10,2024-11-17 |
| Mary | 2024-11-05,2024-11-12,2024-11-19 |

---

## 🔐 安全性

- ✅ 使用 LINE 官方 API，安全可靠
- ✅ Google Apps Script 运行在 Google 服务器，高可用
- ✅ 数据存储在你自己的 Google Sheets，完全掌控
- ✅ 支持 HTTPS，通信加密

---

## 💡 使用技巧

### 1. 批量导入用户

如果你有很多用户需要初始化，可以：
1. 直接在「用户配置」Tab 填写
2. 格式：`[留空] | 姓名 | 完整 | 组别`
3. LINE User ID 会在用户第一次发消息时自动填入

### 2. 快速测试

在部署后，可以使用测试函数：
```javascript
function testNotification() {
  // 在这里添加测试代码
  const userId = 'YOUR_TEST_USER_ID';
  pushMessage(userId, '测试消息');
}
```

### 3. 查看执行日志

前往 Apps Script 编辑器 → 执行，可以看到：
- 函数执行时间
- 错误信息
- Logger.log 输出

### 4. 版本管理

每次修改代码后，建议：
1. 添加版本注释
2. 在部署时写清楚更新内容
3. 保留旧版本以便回滚

---

## 🆘 故障排除

### 常见问题

**Q: Bot 没有回应？**

A: 检查：
1. Webhook URL 是否正确
2. LINE Token 是否正确
3. Apps Script 是否正确部署
4. 查看执行日志

**Q: 定时通知没有发送？**

A: 检查：
1. 触发器是否设置
2. 用户是否绑定
3. Google Sheets 是否有数据
4. 查看执行日志

**Q: 查询结果为空？**

A: 检查：
1. 姓名是否完全一致
2. 日期格式是否正确
3. Tab 名称是否正确

详细的故障排除指南，请参考 [DeployGuide.md](./DeployGuide.md)

---

## 📈 性能说明

### Google Apps Script 限制

- ✅ 每天可执行 6 小时（足够使用）
- ✅ 每分钟可调用 LINE API 60 次
- ✅ 免费配额对大多数团队足够

### 优化建议

- 如果用户超过 100 人，建议分批发送通知
- 定期清理旧的休息日记录
- 使用缓存减少 Sheet 读取次数

---

## 🔄 更新日志

### Version 1.0.0 (2024-11-07)
- ✅ 初始版本
- ✅ 支持完整模式和简化模式
- ✅ 自动定时通知
- ✅ 双公司支持

---

## 📝 开发说明

### 代码结构

```
Code.gs
├── doPost()                    - Webhook 入口
├── handleTextMessage()         - 消息处理路由
├── 命令处理函数
│   ├── handleBindUser()
│   ├── handleSetHolidays()
│   ├── handleCheckTomorrow()
│   └── ...
├── 辅助函数
│   ├── getUserInfo()
│   ├── getShiftForDate()
│   ├── classifyShift()
│   └── ...
├── 消息发送
│   ├── replyMessage()
│   └── pushMessage()
└── 定时任务
    ├── sendMorningNotifications()
    └── sendEveningNotifications()
```

### 扩展功能

如果你想添加新功能，可以：

1. **添加新命令**
```javascript
else if (message === '你的新命令') {
  replyText = handleNewCommand(userId);
}
```

2. **添加新的通知时间**
```javascript
function sendAfternoonNotifications() {
  // 你的代码
}
```

3. **自定义班别分类**
```javascript
function classifyShift(shiftCode) {
  // 修改这个函数添加新的班别类型
}
```

---

## 🤝 贡献

欢迎提交改进建议和 Bug 报告！

---

## 📄 License

MIT License

---

## 👨‍💻 作者

开发用于解决班表管理和自动通知的需求。

---

## 📞 支持

如果你在使用过程中遇到问题：

1. 查看文档：[DeployGuide.md](./DeployGuide.md)
2. 检查日志：Apps Script 编辑器 → 执行
3. 参考示例：[LazyModeGuide.md](./LazyModeGuide.md)

---

**祝使用愉快！** 🎉
