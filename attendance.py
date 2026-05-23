import json
import os
from datetime import datetime, date

DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "attendance_data.json")
OVERTIME_THRESHOLD = 8  # 超過幾小時算加班
OVERTIME_RATE = 1.5     # 加班倍率


def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"employees": {}, "records": []}


def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def add_employee(data):
    name = input("員工姓名：").strip()
    if not name:
        print("姓名不能為空")
        return
    try:
        hourly_wage = float(input("時薪（元）：").strip())
    except ValueError:
        print("時薪格式錯誤")
        return
    emp_id = str(len(data["employees"]) + 1).zfill(3)
    data["employees"][emp_id] = {"name": name, "hourly_wage": hourly_wage}
    save_data(data)
    print(f"已新增員工：{name}（編號 {emp_id}，時薪 {hourly_wage} 元）")


def clock_in(data):
    emp_id = select_employee(data)
    if not emp_id:
        return
    today = date.today().isoformat()
    now = datetime.now().strftime("%H:%M")
    for r in data["records"]:
        if r["emp_id"] == emp_id and r["date"] == today and r["clock_out"] is None:
            print(f"該員工今日已打卡上班（{r['clock_in']}），尚未打卡下班")
            return
    data["records"].append({
        "emp_id": emp_id,
        "name": data["employees"][emp_id]["name"],
        "date": today,
        "clock_in": now,
        "clock_out": None
    })
    save_data(data)
    print(f"上班打卡成功：{data['employees'][emp_id]['name']} {today} {now}")


def clock_out(data):
    emp_id = select_employee(data)
    if not emp_id:
        return
    today = date.today().isoformat()
    now = datetime.now().strftime("%H:%M")
    for r in data["records"]:
        if r["emp_id"] == emp_id and r["date"] == today and r["clock_out"] is None:
            r["clock_out"] = now
            save_data(data)
            hours = calc_hours(r["clock_in"], r["clock_out"])
            print(f"下班打卡成功：{r['name']} {today} {now}（工時 {hours:.1f} 小時）")
            return
    print("找不到今日上班紀錄，請先打卡上班")


def calc_hours(clock_in, clock_out):
    fmt = "%H:%M"
    t1 = datetime.strptime(clock_in, fmt)
    t2 = datetime.strptime(clock_out, fmt)
    return (t2 - t1).seconds / 3600


def calc_salary(data):
    emp_id = select_employee(data)
    if not emp_id:
        return
    emp = data["employees"][emp_id]
    year_month = input("計算月份（YYYY-MM，直接 Enter 為本月）：").strip()
    if not year_month:
        year_month = date.today().strftime("%Y-%m")

    records = [r for r in data["records"]
               if r["emp_id"] == emp_id and r["date"].startswith(year_month) and r["clock_out"]]

    if not records:
        print(f"{emp['name']} 在 {year_month} 無出勤紀錄")
        return

    total_pay = 0.0
    print(f"\n{'='*45}")
    print(f"  員工：{emp['name']}  月份：{year_month}")
    print(f"  時薪：{emp['hourly_wage']} 元  加班倍率：{OVERTIME_RATE}x（>{OVERTIME_THRESHOLD}h）")
    print(f"{'='*45}")
    print(f"  {'日期':<12} {'上班':<7} {'下班':<7} {'工時':>6} {'薪資':>9}")
    print(f"  {'-'*43}")

    for r in sorted(records, key=lambda x: x["date"]):
        hours = calc_hours(r["clock_in"], r["clock_out"])
        if hours <= OVERTIME_THRESHOLD:
            pay = hours * emp["hourly_wage"]
        else:
            pay = (OVERTIME_THRESHOLD * emp["hourly_wage"] +
                   (hours - OVERTIME_THRESHOLD) * emp["hourly_wage"] * OVERTIME_RATE)
        total_pay += pay
        print(f"  {r['date']:<12} {r['clock_in']:<7} {r['clock_out']:<7} {hours:>5.1f}h {pay:>8.0f}元")

    print(f"  {'-'*43}")
    print(f"  {'合計':<33} {total_pay:>8.0f}元")
    print(f"{'='*45}\n")


def view_records(data):
    emp_id = select_employee(data)
    if not emp_id:
        return
    emp = data["employees"][emp_id]
    records = [r for r in data["records"] if r["emp_id"] == emp_id]
    if not records:
        print("無出勤紀錄")
        return
    print(f"\n{emp['name']} 的出勤紀錄：")
    print(f"  {'日期':<12} {'上班':<8} {'下班':<10} {'工時':>6}")
    print(f"  {'-'*38}")
    for r in sorted(records, key=lambda x: x["date"]):
        clock_out_str = r["clock_out"] or "未打卡"
        hours = f"{calc_hours(r['clock_in'], r['clock_out']):.1f}h" if r["clock_out"] else "-"
        print(f"  {r['date']:<12} {r['clock_in']:<8} {clock_out_str:<10} {hours:>6}")
    print()


def select_employee(data):
    if not data["employees"]:
        print("尚無員工資料，請先新增員工")
        return None
    print("\n員工列表：")
    for eid, emp in data["employees"].items():
        print(f"  [{eid}] {emp['name']}（時薪 {emp['hourly_wage']} 元）")
    emp_id = input("請輸入員工編號：").strip().zfill(3)
    if emp_id not in data["employees"]:
        print("找不到此員工")
        return None
    return emp_id


def main():
    data = load_data()
    menu = {
        "1": ("新增員工", add_employee),
        "2": ("上班打卡", clock_in),
        "3": ("下班打卡", clock_out),
        "4": ("查看出勤紀錄", view_records),
        "5": ("計算月薪", calc_salary),
        "0": ("離開", None),
    }
    while True:
        print("\n===== 薪勤管理系統 =====")
        for key, (label, _) in menu.items():
            print(f"  {key}. {label}")
        choice = input("請選擇：").strip()
        if choice == "0":
            print("再見！")
            break
        elif choice in menu:
            menu[choice][1](data)
        else:
            print("無效選項，請重新輸入")


if __name__ == "__main__":
    main()
