"""
测试你的班表文件
使用前请确保：
1. 你的 Excel 班表文件已复制到此目录，命名为 schedule.xlsx
2. 根据实际情况调整 start_row 和 name_col 参数
"""

from schedule_parser import ScheduleParser
import os

print("=" * 80)
print("📊 班表解析测试")
print("=" * 80)
print()

# 检查文件是否存在
excel_file = 'schedule.xlsx'

if not os.path.exists(excel_file):
    print("❌ 找不到班表文件！")
    print()
    print("请执行以下步骤：")
    print("1. 找到你的 Excel 班表文件")
    print("2. 复制到这个目录：/home/user/linebot-duties/")
    print("3. 重命名为：schedule.xlsx")
    print()
    print("示例命令：")
    print("  cp /path/to/your/班表.xlsx /home/user/linebot-duties/schedule.xlsx")
    print()
    exit(1)

print("✅ 找到班表文件：schedule.xlsx")
print()

# ========================================
# 🔧 重要：根据你的班表格式调整这里！
# ========================================
#
# start_row: 员工数据从第几行开始？（从1开始计数）
# name_col:  员工姓名在第几列？（从1开始计数）
#
# 根据你的截图：
# - 第1行是日期
# - 第2行是星期
# - 第3行开始是员工数据
# - 第2列（B列）是姓名
#
START_ROW = 3  # 👈 如果不对，修改这个数字
NAME_COL = 2   # 👈 如果不对，修改这个数字

print(f"📌 解析参数：")
print(f"   - 数据起始行：第 {START_ROW} 行")
print(f"   - 姓名列：第 {NAME_COL} 列")
print()
print("   如果下面的结果不对，请修改 test_my_schedule.py 中的 START_ROW 和 NAME_COL")
print()

try:
    # 载入班表
    print("正在解析班表...")
    parser = ScheduleParser(excel_file)
    schedule_data = parser.parse_schedule(start_row=START_ROW, name_col=NAME_COL)

    # 获取所有员工
    employees = parser.get_all_employees(schedule_data)

    print(f"✅ 解析成功！找到 {len(employees)} 位员工")
    print()

    # 显示员工列表
    print("=" * 80)
    print("👥 员工列表")
    print("=" * 80)
    for i, name in enumerate(employees, 1):
        print(f"{i:3d}. {name}")
    print()

    # 交互式查询
    while True:
        print("=" * 80)
        print("🔍 查询员工班表")
        print("=" * 80)
        print()
        print("输入选项：")
        print("  1. 输入员工姓名（例如：Jessica）")
        print("  2. 输入员工编号（例如：1）")
        print("  3. 输入 'all' 显示所有员工摘要")
        print("  4. 输入 'q' 或 'quit' 退出")
        print()

        user_input = input("请输入 👉 ").strip()

        if user_input.lower() in ['q', 'quit', 'exit', '退出']:
            print()
            print("👋 再见！")
            break

        if user_input.lower() == 'all':
            print()
            parser.print_all_summary(schedule_data)
            continue

        # 尝试解析为数字
        try:
            index = int(user_input) - 1
            if 0 <= index < len(employees):
                employee_name = employees[index]
            else:
                print(f"❌ 编号超出范围！请输入 1-{len(employees)}")
                print()
                continue
        except ValueError:
            # 不是数字，当作姓名处理
            employee_name = user_input

        # 查询员工
        print()
        parser.print_employee_summary(employee_name, schedule_data)

except FileNotFoundError:
    print("❌ 无法打开文件！")
    print("请确认文件格式是 .xlsx（不是 .xls 或 .csv）")
    print()

except Exception as e:
    print(f"❌ 发生错误：{e}")
    print()
    print("可能的原因：")
    print("1. 班表格式与预期不符")
    print("2. START_ROW 或 NAME_COL 参数不正确")
    print()
    print("请告诉我你看到的错误信息，我会帮你解决！")
    print()

    # 打印详细错误信息（方便调试）
    import traceback
    print("详细错误信息：")
    print("-" * 80)
    traceback.print_exc()
