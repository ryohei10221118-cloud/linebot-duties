# 📘 完整部署教程

这份教程会一步步教你如何部署 LINE Bot 班表查询系统。

## 🎯 前置准备

在开始之前，请确认你已经：
- ✅ 有 LINE Bot 账号（LINE Channel Access Token 和 Channel Secret）
- ✅ 有 Google 账号
- ✅ 阅读了 [Google Sheets 设置指南](./GoogleSheetsSetup.md)

---

## 📚 部署流程概览

```
第1步：设置 Google Sheets  (10分钟)
    ↓
第2步：创建 Apps Script 项目 (5分钟)
    ↓
第3步：部署为 Web 应用  (5分钟)
    ↓
第4步：设置 LINE Webhook  (2分钟)
    ↓
第5步：设置定时触发器  (3分钟)
    ↓
第6步：测试  (5分钟)
```

**总时间：约 30 分钟**

---

## 第1步：设置 Google Sheets

请按照 [GoogleSheetsSetup.md](./GoogleSheetsSetup.md) 的说明设置 Google Sheets。

完成后，你应该有：
- ✅ 一个包含 4 个 Tab 的 Google Sheets
- ✅ Sheet ID（从网址中复制）

---

## 第2步：创建 Apps Script 项目

### 2.1 打开 Apps Script 编辑器

1. 在你的 Google Sheets 中，点击菜单：`扩充功能` → `Apps Script`
2. 会打开一个新的标签页，这就是 Apps Script 编辑器

### 2.2 删除默认代码

在编辑器中，你会看到默认的 `function myFunction()` 代码。

**全部删除**（选中所有内容，按 Delete）

### 2.3 复制粘贴代码

1. 打开项目中的 `Code.gs` 文件
2. **全部复制**
3. **粘贴**到 Apps Script 编辑器中

### 2.4 配置 LINE Bot Token

在代码的第 11 行附近，找到这一行：

```javascript
const LINE_CHANNEL_ACCESS_TOKEN = 'YOUR_CHANNEL_ACCESS_TOKEN_HERE';
```

**替换为你的 LINE Channel Access Token：**

```javascript
const LINE_CHANNEL_ACCESS_TOKEN = 'your_actual_token_here';
```

### 2.5 保存项目

1. 点击顶部的「💾 保存项目」图标
2. 给项目起个名字，例如：`班表查询Bot`
3. 点击「确定」

---

## 第3步：部署为 Web 应用

### 3.1 开始部署

1. 点击右上角的「部署」按钮
2. 选择「新部署」

### 3.2 选择类型

1. 点击「选择类型」旁边的齿轮图标 ⚙️
2. 选择「网页应用程序」

### 3.3 配置部署设置

填写以下信息：

**说明（可选）：**
```
初次部署
```

**执行身份：**
```
我（你的 Gmail 账号）
```

**谁可以存取：**
```
任何人
```

⚠️ **重要**：必须选择「任何人」，否则 LINE 无法访问你的 Webhook。

### 3.4 授权

1. 点击「部署」
2. 会弹出授权请求，点击「审查权限」
3. 选择你的 Google 账号
4. 点击「前往 班表查询Bot（不安全）」
   - 是的，会显示「不安全」，这是正常的，因为这是你自己的脚本
5. 点击「允许」

### 3.5 获取 Web 应用网址

部署成功后，你会看到：

```
网页应用程序
网址：https://script.google.com/macros/s/AKfycby.../exec
```

**复制这个网址**，这就是你的 Webhook URL！

⚠️ **重要**：不要点击「测试部署」旁边的网址，那个是测试网址，不能用于正式环境。

---

## 第4步：设置 LINE Webhook

### 4.1 前往 LINE Developers Console

1. 打开 https://developers.line.biz/console/
2. 选择你的 Provider
3. 选择你的 Messaging API Channel

### 4.2 设置 Webhook URL

1. 在左侧菜单选择「Messaging API」
2. 找到「Webhook settings」区域
3. 点击「Edit」
4. 粘贴刚才复制的 Web 应用网址：
   ```
   https://script.google.com/macros/s/AKfycby.../exec
   ```
5. 点击「Update」
6. 启用「Use webhook」开关（打开）

### 4.3 验证 Webhook

1. 点击「Verify」按钮
2. 如果显示「Success」，恭喜你设置成功！
3. 如果显示错误，请检查：
   - Web 应用网址是否正确
   - Apps Script 是否正确部署
   - 是否选择了「任何人」可访问

### 4.4 禁用自动回复

为了避免冲突，建议禁用 LINE 的自动回复：

1. 在同一页面找到「Auto-reply messages」
2. 点击「Edit」
3. 关闭「Enabled」开关
4. 保存

---

## 第5步：设置定时触发器

### 5.1 打开触发器设置

1. 回到 Apps Script 编辑器
2. 点击左侧的「⏰ 触发器」（时钟图标）

### 5.2 创建早上通知触发器

1. 点击右下角「+ 添加触发器」
2. 配置如下：

   - **选择要执行的函数**：`sendMorningNotifications`
   - **选择事件来源**：`时间驱动`
   - **选择时间型触发器类型**：`日计时器`
   - **选择一天中的时间**：`上午 9 时至 10 时`

3. 点击「保存」

### 5.3 创建晚上通知触发器

1. 再次点击「+ 添加触发器」
2. 配置如下：

   - **选择要执行的函数**：`sendEveningNotifications`
   - **选择事件来源**：`时间驱动`
   - **选择时间型触发器类型**：`日计时器`
   - **选择一天中的时间**：`下午 9 时至 10 时`

3. 点击「保存」

### 5.4 确认触发器

你应该看到两个触发器：

```
sendMorningNotifications  - 每日 09:00-10:00
sendEveningNotifications  - 每日 21:00-22:00
```

---

## 第6步：测试

### 6.1 加 Bot 为好友

1. 在 LINE Developers Console 的「Messaging API」页面
2. 找到「QR code」
3. 用手机扫描加为好友

### 6.2 测试绑定功能

**测试完整模式：**

发送消息：
```
绑定 Jessica M1组
```

Bot 应该回复：
```
✅ 绑定成功！

👤 姓名：Jessica
📊 模式：完整模式
👥 组别：M1组

你可以使用以下命令：
• 明天上班吗
• 本周班表
• 同班人员
```

**测试简化模式：**

发送消息：
```
绑定 John
```

Bot 应该回复：
```
✅ 绑定成功！

👤 姓名：John
📊 模式：简化模式

请设置你的休息日：
例如：休息日 11/3,11/10,11/17

设置后系统会每天自动提醒你！
```

### 6.3 测试查询功能

**完整模式测试：**

发送：
```
明天上班吗
```

Bot 应该回复明天的班别信息。

**简化模式测试：**

先设置休息日：
```
休息日 11/3,11/10,11/17,11/24
```

然后查询：
```
明天上班吗
```

Bot 应该回复是否需要上班。

### 6.4 测试帮助功能

发送：
```
帮助
```

Bot 应该显示完整的帮助信息。

---

## ✅ 部署完成！

恭喜你！如果所有测试都通过了，系统已经成功部署！

### 现在系统会：

- ✅ 每天早上 9 点自动通知夜班人员
- ✅ 每天晚上 9 点自动通知早班/中班人员
- ✅ 响应用户的查询命令
- ✅ 支持完整模式和简化模式

---

## 🔧 维护和更新

### 更新班表

**完整模式：**
1. 直接在 Google Sheets 的「完整班表」Tab 中修改
2. 系统会立即读取最新数据
3. 不需要重新部署

**简化模式：**
1. 用户在 LINE 输入：`休息日 11/3,11/10,11/17`
2. 系统自动更新

### 更新代码

如果你需要修改 Apps Script 代码：

1. 在 Apps Script 编辑器中修改代码
2. 点击「保存」
3. 点击「部署」→「管理部署」
4. 点击现有部署旁边的「✏️ 编辑」
5. 在「版本」下拉选择「新版本」
6. 点击「部署」

⚠️ **重要**：Webhook URL 不会改变，不需要更新 LINE 设置。

### 查看日志

如果遇到问题，可以查看执行日志：

1. 在 Apps Script 编辑器中
2. 点击左侧的「📝 执行」
3. 查看最近的执行记录
4. 点击任意记录查看详细日志

---

## 🆘 故障排除

### Bot 没有回应

**检查清单：**
1. Webhook URL 是否正确设置？
2. LINE Webhook 是否已启用？
3. Apps Script 是否正确部署？
4. 查看 Apps Script 执行日志是否有错误

**解决方法：**
- 前往 Apps Script 编辑器 → 执行 → 查看错误
- 确认 LINE_CHANNEL_ACCESS_TOKEN 是否正确

### 定时通知没有发送

**检查清单：**
1. 触发器是否正确设置？
2. 用户是否已绑定身份？
3. Google Sheets 中是否有数据？

**解决方法：**
- 前往 Apps Script 编辑器 → 触发器 → 确认触发器存在
- 查看执行日志确认函数是否执行
- 手动运行 `sendMorningNotifications` 或 `sendEveningNotifications` 测试

### 查询班表返回空白

**检查清单：**
1. Google Sheets 中的姓名是否与绑定的姓名完全一致？
2. 日期格式是否正确（`11/1` 格式）？
3. Tab 名称是否正确？

**解决方法：**
- 确认「完整班表」中有该员工的列
- 确认日期格式为 `11/1`, `11/2` 等
- 确认 Tab 名称为「完整班表」（完全一致）

### 组别查询失败

**检查清单：**
1. 「组别配置」Tab 中是否有该组别？
2. 成员列表格式是否正确（逗号分隔，无空格）？

**解决方法：**
- 确认成员列表格式：`Jessica,Sam,John` ✅
- 不要有空格：`Jessica, Sam, John` ❌

---

## 🎓 高级设置（可选）

### 自定义通知时间

如果你想修改通知时间（例如改为早上 8 点和晚上 10 点）：

1. 前往 Apps Script 编辑器 → 触发器
2. 删除现有触发器
3. 创建新触发器，选择不同的时间

### 添加更多命令

你可以在 `Code.gs` 中添加更多命令。例如：

```javascript
else if (message === '本月统计') {
  replyText = handleMonthlyStats(userId);
}
```

然后实现 `handleMonthlyStats` 函数。

### 多语言支持

如果需要支持英文或其他语言，可以修改消息文本。

---

## 📞 需要帮助？

如果在部署过程中遇到问题：

1. 查看 Apps Script 执行日志
2. 确认所有配置是否正确
3. 参考故障排除部分
4. 如果问题依然存在，请提供：
   - 错误信息截图
   - Apps Script 执行日志
   - 你执行的步骤

---

## 🎉 下一步

部署完成后，可以：

1. 邀请同事加入并绑定身份
2. 更新班表数据
3. 查看 [懒人模式使用指南](./LazyModeGuide.md) 分享给使用简化模式的用户

---

祝使用愉快！ 🚀
