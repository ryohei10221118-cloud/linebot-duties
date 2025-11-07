# LINE Bot 班表查询系统

一个用于查询和统计员工班表的 LINE Bot 系统，支持正确分类 N1/N2/N3、M1/M2/M3、A1/A2 等班别。

## ✨ 功能特点

- 📊 **智能班别分类**：自动将 N/N1/N2/N3 归类为夜班，M/M1/M2/M3 归类为早班，A/A1/A2 归类为中班
- 📱 **LINE Bot 集成**：通过 LINE 聊天机器人即时查询班表
- 📈 **统计分析**：自动统计各类班别的天数
- 📝 **Excel 支持**：直接读取 Excel 格式的班表文件

## 📋 班别分类规则

| 班别代码 | 分类结果 | 说明 |
|---------|---------|------|
| N, N1, N2, N3 | 夜班 🌙 | 所有 N 开头的都是夜班 |
| M, M1, M2, M3 | 早班 🌅 | 所有 M 开头的都是早班 |
| A, A1, A2 | 中班 🌤️ | 所有 A 开头的都是中班 |
| O | 休息 😴 | 休息日 |
| P | 休假 🏖️ | 一般休假 |
| BTD | 出差 ✈️ | 出差日 |
| SL | 病假 🤒 | 病假 |
| ML, AL, PL | 休假 🏖️ | 其他休假类型 |

## 🚀 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 设置环境变量

复制 `.env.example` 为 `.env` 并填入你的配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```
LINE_CHANNEL_ACCESS_TOKEN=你的_LINE_Channel_Access_Token
LINE_CHANNEL_SECRET=你的_LINE_Channel_Secret
SCHEDULE_FILE_PATH=schedule.xlsx
PORT=5000
```

### 3. 准备班表文件

将你的 Excel 班表文件命名为 `schedule.xlsx` 放在项目根目录，或在 `.env` 中指定路径。

### 4. 运行 LINE Bot

```bash
python linebot_app.py
```

## 📖 使用说明

### 命令行使用

#### 测试班别分类

```bash
python shift_classifier.py
```

#### 解析班表

```python
from schedule_parser import ScheduleParser

# 载入班表
parser = ScheduleParser('schedule.xlsx')
schedule_data = parser.parse_schedule(start_row=3, name_col=2)

# 查询员工班表
parser.print_employee_summary('Jessica', schedule_data)

# 打印所有员工摘要
parser.print_all_summary(schedule_data)
```

### LINE Bot 使用

在 LINE 中向机器人发送：

- `帮助` - 显示帮助信息
- `查询 [姓名]` - 查询指定员工的班表
- `员工列表` - 显示所有员工列表

示例：
```
查询 Jessica
```

输出：
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

## 📁 项目结构

```
linebot-duties/
├── shift_classifier.py    # 班别分类核心逻辑
├── schedule_parser.py      # Excel 班表解析器
├── linebot_app.py          # LINE Bot 主程序
├── requirements.txt        # Python 依赖
├── .env.example           # 环境变量示例
├── .env                   # 环境变量配置（不提交到 Git）
└── README.md              # 项目文档
```

## 🔧 API 参考

### `shift_classifier.classify_shift(shift_code)`

分类单个班别代码。

**参数：**
- `shift_code` (str): 班别代码，如 'N1', 'M2', 'A', 'O' 等

**返回：**
- (str): 分类后的班别名称，如 '夜班', '早班', '中班' 等

**示例：**
```python
from shift_classifier import classify_shift

print(classify_shift('N1'))   # 输出: 夜班
print(classify_shift('M2'))   # 输出: 早班
print(classify_shift('A'))    # 输出: 中班
```

### `shift_classifier.analyze_shifts(shift_list)`

分析班别列表，统计各班别数量。

**参数：**
- `shift_list` (list): 班别代码列表

**返回：**
- (dict): 各班别的统计结果

**示例：**
```python
from shift_classifier import analyze_shifts

shifts = ['N1', 'N2', 'M1', 'A', 'O', 'P']
stats = analyze_shifts(shifts)
print(stats)
# 输出: {'夜班': 2, '早班': 1, '中班': 1, '休息': 1, '休假': 1, ...}
```

### `ScheduleParser(excel_path, sheet_name=None)`

Excel 班表解析器类。

**参数：**
- `excel_path` (str): Excel 文件路径
- `sheet_name` (str, optional): 工作表名称，默认使用第一个工作表

**方法：**
- `parse_schedule(start_row, name_col)`: 解析班表数据
- `analyze_employee_schedule(employee_name, schedule_data)`: 分析单个员工的班表
- `get_all_employees(schedule_data)`: 获取所有员工列表
- `print_employee_summary(employee_name, schedule_data)`: 打印员工班表摘要

## 🛠️ 开发

### 运行测试

```bash
# 测试班别分类
python shift_classifier.py

# 测试班表解析
python schedule_parser.py
```

### 部署到生产环境

1. 设置 LINE Bot Webhook URL
2. 使用 ngrok 或其他工具暴露本地端口（开发环境）
3. 或部署到云服务器（生产环境）

## 📝 注意事项

1. **班表格式**：确保 Excel 班表格式与解析器兼容
2. **起始行和列**：根据实际班表调整 `start_row` 和 `name_col` 参数
3. **安全性**：不要将 `.env` 文件提交到版本控制系统
4. **LINE Bot 设置**：需要在 LINE Developers Console 设置 Webhook URL

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

MIT License

## 👨‍💻 作者

开发用于解决班表统计中 N1/N2/N3 被错误分类的问题。

---

**重要提醒**：所有 N 开头的班别（N, N1, N2, N3）都应该归类为同一个班别（夜班）！