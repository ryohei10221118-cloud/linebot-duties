# 📚 班表查询系统使用教程

## 目录
1. [快速测试（你已完成！）](#1-快速测试)
2. [解析 Excel 班表](#2-解析-excel-班表)
3. [设置 LINE Bot（可选）](#3-设置-line-bot可选)

---

## 1. 快速测试 ✅

你已经完成了！刚才的测试确认了：
- ✅ N、N1、N2、N3 都归类为夜班
- ✅ M、M1、M2、M3 都归类为早班
- ✅ A、A1、A2 都归类为中班

---

## 2. 解析 Excel 班表

### 步骤 2.1：准备你的 Excel 班表文件

1. **找到你的 Excel 班表文件**（就是你截图中的那个文件）
2. **复制到项目目录**，重命名为 `schedule.xlsx`

```bash
# 在终端执行（根据你的文件实际路径调整）
cp /path/to/your/班表文件.xlsx /home/user/linebot-duties/schedule.xlsx
```

或者直接用文件管理器复制到 `/home/user/linebot-duties/` 目录。

---

### 步骤 2.2：创建测试脚本

我会为你创建一个简单的测试脚本，你只需要运行它就能看到结果。

**test_my_schedule.py** - 这个文件会：
- 读取你的 Excel 班表
- 显示所有员工列表
- 让你查询任何员工的班表统计

---

### 步骤 2.3：调整参数（重要！）

根据你的班表格式，需要调整这两个参数：

```python
# 这两个参数需要根据你的实际班表调整
schedule_data = parser.parse_schedule(
    start_row=3,   # 👈 员工数据从第几行开始？（从1开始计数）
    name_col=2     # 👈 员工姓名在第几列？（从1开始计数）
)
```

**如何确定参数？**

看你的截图：
- 第1行：日期行（10/30, 10/31, 11/1...）
- 第2行：星期行（Thu, Fri, Sun...）
- 第3行：Head / Jessica 的数据开始

所以：
- `start_row=3`（数据从第3行开始）
- 姓名在第2列（A列是组别M1/A1/N1，B列是姓名）

如果你的格式不同，需要调整这些数字。

---

### 步骤 2.4：运行测试

```bash
python3 test_my_schedule.py
```

你会看到：
1. 所有员工的列表
2. 可以输入员工姓名查询班表
3. 显示该员工的班别统计

**示例输出：**
```
📋 Jessica 的班表
==============================
📅 总天数: 25 天

📊 班别统计:
  🌙 夜班: 8 天
  🌅 早班: 10 天
  🌤️ 中班: 5 天
  😴 休息: 2 天
```

---

## 3. 设置 LINE Bot（可选）

如果你想让团队成员通过 LINE 查询班表，继续以下步骤：

### 步骤 3.1：创建 LINE Bot

1. **前往 LINE Developers Console**
   - 网址：https://developers.line.biz/console/

2. **创建 Provider**（如果还没有）
   - 点击 "Create a new provider"
   - 输入名称，例如："我的公司"

3. **创建 Messaging API Channel**
   - 点击 "Create a new channel"
   - 选择 "Messaging API"
   - 填写信息：
     - Channel name: 班表查询 Bot
     - Channel description: 员工班表查询系统
     - Category: 选择合适的类别
     - Subcategory: 选择合适的子类别

4. **获取凭证**
   - 创建后，进入 Channel 页面
   - 在 "Basic settings" 找到 **Channel Secret**（复制它）
   - 在 "Messaging API" 找到 **Channel Access Token**（如果没有，点击 Issue 创建，然后复制它）

---

### 步骤 3.2：配置环境变量

1. **复制示例配置文件：**
   ```bash
   cp .env.example .env
   ```

2. **编辑 .env 文件：**
   ```bash
   nano .env
   # 或者用你喜欢的编辑器
   ```

3. **填入你的凭证：**
   ```
   LINE_CHANNEL_ACCESS_TOKEN=你刚才复制的_Channel_Access_Token
   LINE_CHANNEL_SECRET=你刚才复制的_Channel_Secret
   SCHEDULE_FILE_PATH=schedule.xlsx
   PORT=5000
   ```

---

### 步骤 3.3：安装依赖

```bash
pip install -r requirements.txt
```

---

### 步骤 3.4：启动 LINE Bot

```bash
python3 linebot_app.py
```

你会看到：
```
* Running on http://0.0.0.0:5000
```

---

### 步骤 3.5：设置 Webhook URL

1. **暴露你的本地端口**（开发环境）

   使用 ngrok：
   ```bash
   # 另开一个终端
   ngrok http 5000
   ```

   你会得到一个 URL，例如：`https://abc123.ngrok.io`

2. **设置 Webhook URL**
   - 回到 LINE Developers Console
   - 进入你的 Channel 页面
   - 在 "Messaging API" 找到 "Webhook settings"
   - 填入：`https://abc123.ngrok.io/callback`
   - 点击 "Update"
   - 启用 "Use webhook"

3. **验证 Webhook**
   - 点击 "Verify" 按钮
   - 如果显示 "Success"，就大功告成了！

---

### 步骤 3.6：测试 LINE Bot

1. **加 Bot 为好友**
   - 在 LINE Developers Console 的 "Messaging API" 页面
   - 找到 QR Code
   - 用手机扫描加为好友

2. **发送测试消息**
   ```
   帮助
   ```

   Bot 应该回复使用说明。

3. **查询班表**
   ```
   查询 Jessica
   ```

   Bot 应该回复 Jessica 的班表统计。

---

## 🎯 常见问题

### Q1: Excel 读取失败怎么办？
**A:** 检查：
1. 文件名是否为 `schedule.xlsx`
2. 文件是否在正确的目录
3. 文件格式是否为 `.xlsx`（不是 `.xls` 或 `.csv`）

### Q2: 员工数据读取不正确？
**A:** 调整 `start_row` 和 `name_col` 参数：
```python
# 在你的测试脚本中
schedule_data = parser.parse_schedule(
    start_row=?,   # 调整这个数字
    name_col=?     # 调整这个数字
)
```

### Q3: 某些班别代码没有被识别？
**A:** 告诉我新的班别代码，我会帮你添加到分类逻辑中。

### Q4: LINE Bot 没有回应？
**A:** 检查：
1. Webhook URL 是否正确设置
2. ngrok 是否还在运行
3. `linebot_app.py` 是否还在运行
4. 查看终端是否有错误信息

---

## 📞 需要帮助？

如果在任何步骤遇到问题，告诉我：
1. 你在哪一步
2. 看到什么错误信息
3. 你想实现什么功能

我会具体帮你解决！

---

## 🎉 快速开始

**最简单的使用方式：**

1. ✅ 你已经测试了班别分类（完成）
2. 📊 如果只想看统计，进行**步骤 2**
3. 📱 如果要 LINE Bot，进行**步骤 3**

**推荐顺序：** 先完成步骤 2，确认 Excel 解析正确，再考虑步骤 3。
