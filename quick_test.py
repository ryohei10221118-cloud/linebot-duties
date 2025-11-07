"""
快速测试：验证班别分类是否正确
"""

from shift_classifier import classify_shift, analyze_shifts

print("=" * 70)
print("🧪 快速测试：班别分类验证")
print("=" * 70)
print()

# 测试你班表中会出现的所有班别代码
test_shifts = [
    # 夜班组
    "N", "N1", "N2", "N3",
    # 早班组
    "M", "M1", "M2", "M3",
    # 中班组
    "A", "A1", "A2",
    # 其他
    "O", "P", "BTD", "SL", "ML", "AL"
]

print("📋 各班别代码的分类结果：")
print("-" * 70)

for shift in test_shifts:
    category = classify_shift(shift)
    emoji = {
        '夜班': '🌙',
        '早班': '🌅',
        '中班': '🌤️',
        '休息': '😴',
        '休假': '🏖️',
        '出差': '✈️',
        '病假': '🤒'
    }.get(category, '❓')

    print(f"  {shift:6s} → {emoji} {category}")

print()
print("=" * 70)
print("✅ 验证重点")
print("=" * 70)
print("1. N、N1、N2、N3 是否都显示为 🌙 夜班？")
print("2. M、M1、M2、M3 是否都显示为 🌅 早班？")
print("3. A、A1、A2 是否都显示为 🌤️ 中班？")
print()

# 模拟一个月的班表统计
print("=" * 70)
print("📊 示例：某员工一个月的班表统计")
print("=" * 70)
employee_shifts = ["N1", "N2", "N3", "N1", "N2", "O", "O",
                   "M1", "M2", "M3", "M1", "M2", "O", "P",
                   "A1", "A2", "A1", "A2", "A1", "O", "O",
                   "N3", "N1", "N2", "N3", "N1", "O", "P"]

stats = analyze_shifts(employee_shifts)

print(f"总天数: {len(employee_shifts)} 天")
print()
print("班别统计:")
for shift_type, count in stats.items():
    if count > 0:
        emoji = {
            '夜班': '🌙',
            '早班': '🌅',
            '中班': '🌤️',
            '休息': '😴',
            '休假': '🏖️'
        }.get(shift_type, '📌')
        print(f"  {emoji} {shift_type}: {count} 天")

print()
print("✨ 注意：所有 N1、N2、N3 都被计入「夜班」，不是分开计算！")
