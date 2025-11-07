"""
LINE Bot 班表查询系统
用户可以通过 LINE 查询自己的班表和统计信息
"""

import os
from flask import Flask, request, abort
from linebot import LineBotApi, WebhookHandler
from linebot.exceptions import InvalidSignatureError
from linebot.models import MessageEvent, TextMessage, TextSendMessage
from dotenv import load_dotenv
from schedule_parser import ScheduleParser
from shift_classifier import classify_shift

# 载入环境变量
load_dotenv()

app = Flask(__name__)

# LINE Bot 设置
LINE_CHANNEL_ACCESS_TOKEN = os.getenv('LINE_CHANNEL_ACCESS_TOKEN')
LINE_CHANNEL_SECRET = os.getenv('LINE_CHANNEL_SECRET')
SCHEDULE_FILE_PATH = os.getenv('SCHEDULE_FILE_PATH', 'schedule.xlsx')

line_bot_api = LineBotApi(LINE_CHANNEL_ACCESS_TOKEN)
handler = WebhookHandler(LINE_CHANNEL_SECRET)


def load_schedule():
    """载入班表数据"""
    try:
        parser = ScheduleParser(SCHEDULE_FILE_PATH)
        # 假设数据从第3行开始，姓名在第2列
        # 你可以根据实际情况调整这些参数
        schedule_data = parser.parse_schedule(start_row=3, name_col=2)
        return parser, schedule_data
    except Exception as e:
        print(f"载入班表失败: {e}")
        return None, None


def format_employee_summary(employee_name, parser, schedule_data):
    """
    格式化员工班表摘要信息

    参数:
        employee_name (str): 员工姓名
        parser (ScheduleParser): 解析器对象
        schedule_data (dict): 班表数据

    返回:
        str: 格式化的摘要信息
    """
    analysis = parser.analyze_employee_schedule(employee_name, schedule_data)

    if not analysis:
        return f"找不到员工: {employee_name}"

    message = f"📋 {analysis['name']} 的班表\n"
    message += "=" * 30 + "\n"
    message += f"📅 总天数: {analysis['total_days']} 天\n\n"
    message += "📊 班别统计:\n"

    for shift_type, count in analysis['stats'].items():
        if count > 0:
            emoji = {
                '夜班': '🌙',
                '早班': '🌅',
                '中班': '🌤️',
                '休息': '😴',
                '休假': '🏖️',
                '出差': '✈️',
                '病假': '🤒'
            }.get(shift_type, '📌')
            message += f"  {emoji} {shift_type}: {count} 天\n"

    return message


def get_help_message():
    """获取帮助信息"""
    return """🤖 班表查询 Bot 使用说明

📝 可用命令：
• 查询 [姓名] - 查询指定员工的班表
• 我的班表 - 查询自己的班表（需设置）
• 帮助 - 显示此帮助信息

📊 班别说明：
• N/N1/N2/N3 = 夜班 🌙
• M/M1/M2/M3 = 早班 🌅
• A/A1/A2 = 中班 🌤️
• O = 休息 😴
• P = 休假 🏖️

示例：
查询 Jessica
"""


@app.route("/callback", methods=['POST'])
def callback():
    """LINE Bot Webhook 回调"""
    signature = request.headers['X-Line-Signature']
    body = request.get_data(as_text=True)
    app.logger.info("Request body: " + body)

    try:
        handler.handle(body, signature)
    except InvalidSignatureError:
        abort(400)

    return 'OK'


@handler.add(MessageEvent, message=TextMessage)
def handle_message(event):
    """处理文字消息"""
    user_message = event.message.text.strip()

    # 载入班表
    parser, schedule_data = load_schedule()

    if not parser or not schedule_data:
        line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text="❌ 班表文件载入失败，请联系管理员")
        )
        return

    # 处理帮助命令
    if user_message in ['帮助', 'help', '说明', '?', '？']:
        reply_text = get_help_message()

    # 处理查询命令
    elif user_message.startswith('查询'):
        # 提取姓名
        name_part = user_message.replace('查询', '').strip()
        if name_part:
            reply_text = format_employee_summary(name_part, parser, schedule_data)
        else:
            reply_text = "请输入要查询的姓名，例如：\n查询 Jessica"

    # 处理员工列表
    elif user_message in ['员工列表', '所有员工', 'list']:
        employees = parser.get_all_employees(schedule_data)
        reply_text = "👥 员工列表：\n\n"
        reply_text += "\n".join([f"• {name}" for name in employees[:50]])  # 限制显示前50个
        if len(employees) > 50:
            reply_text += f"\n\n... 及其他 {len(employees) - 50} 位员工"

    # 默认回应
    else:
        reply_text = "👋 你好！\n\n"
        reply_text += "我可以帮你查询班表信息。\n"
        reply_text += "输入「帮助」查看使用说明。\n"
        reply_text += "输入「查询 [姓名]」查询班表。"

    # 回复消息
    line_bot_api.reply_message(
        event.reply_token,
        TextSendMessage(text=reply_text)
    )


if __name__ == "__main__":
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
