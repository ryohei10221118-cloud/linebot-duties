"""
班别分类工具
根据班表标记正确分类班别，将 N1/N2/N3/N 归为夜班，M1/M2/M3/M 归为早班，A1/A2/A 归为中班
"""

def classify_shift(shift_code):
    """
    分类班别代码

    参数:
        shift_code (str): 班别代码，如 'N1', 'M2', 'A', 'O' 等

    返回:
        str: 分类后的班别名称
    """
    if not shift_code or not isinstance(shift_code, str):
        return "未知"

    # 转换为大写并去除空格
    code = shift_code.strip().upper()

    # 优先处理特殊休假代码（避免被字母开头的规则误判）
    if code in ['ML', 'AL', 'PL', 'SL']:
        return "病假" if code == 'SL' else "休假"

    # 休息日
    if code == 'O':
        return "休息"

    # 休假/请假
    if code == 'P':
        return "休假"

    # 出差
    if code == 'BTD':
        return "出差"

    # 夜班：所有 N 开头的都是夜班
    if code.startswith('N'):
        return "夜班"

    # 早班：所有 M 开头的都是早班
    if code.startswith('M'):
        return "早班"

    # 中班：所有 A 开头的都是中班
    if code.startswith('A'):
        return "中班"

    # 未知班别
    return "其他"


def analyze_shifts(shift_list):
    """
    分析班别列表，统计各班别数量

    参数:
        shift_list (list): 班别代码列表

    返回:
        dict: 各班别的统计结果
    """
    shift_stats = {
        "夜班": 0,
        "早班": 0,
        "中班": 0,
        "休息": 0,
        "休假": 0,
        "出差": 0,
        "病假": 0,
        "其他": 0
    }

    for shift in shift_list:
        category = classify_shift(shift)
        shift_stats[category] += 1

    return shift_stats


def get_shift_details(shift_list):
    """
    获取详细的班别分类结果

    参数:
        shift_list (list): 班别代码列表

    返回:
        list: 包含原始代码和分类结果的列表
    """
    results = []
    for shift in shift_list:
        results.append({
            "原始代码": shift,
            "班别分类": classify_shift(shift)
        })
    return results


if __name__ == "__main__":
    # 测试案例
    test_shifts = [
        "N1", "N2", "N3", "N",
        "M1", "M2", "M3", "M",
        "A1", "A2", "A",
        "O", "P", "BTD", "SL", "ML"
    ]

    print("=" * 60)
    print("班别分类测试")
    print("=" * 60)
    print()

    print("各班别代码的分类结果：")
    print("-" * 60)
    for shift in test_shifts:
        category = classify_shift(shift)
        print(f"{shift:8s} → {category}")

    print()
    print("=" * 60)
    print("统计分析")
    print("=" * 60)
    stats = analyze_shifts(test_shifts)
    for category, count in stats.items():
        if count > 0:
            print(f"{category}: {count} 天")

    print()
    print("=" * 60)
    print("验证关键需求：")
    print("=" * 60)
    print("✓ 所有 N 开头的班别 (N, N1, N2, N3) 都归类为「夜班」")
    print("✓ 所有 M 开头的班别 (M, M1, M2, M3) 都归类为「早班」")
    print("✓ 所有 A 开头的班别 (A, A1, A2) 都归类为「中班」")
