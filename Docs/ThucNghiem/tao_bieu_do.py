"""Render publication figures and the results chapter from exported, measured results."""
from pathlib import Path
import json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

BASE = Path(__file__).resolve().parent
experiment = json.loads((BASE / "DuBao_MoPhong_36Thang.json").read_text(encoding="utf-8-sig"))
live = json.loads((BASE / "DuLieuHienTai_TongHop.json").read_text(encoding="utf-8-sig"))
workflow = json.loads((BASE / "KiemThuQuyTrinh.json").read_text(encoding="utf-8-sig"))
statistics = json.loads((BASE / "KiemThuThongKe.json").read_text(encoding="utf-8-sig"))
ui = json.loads((BASE / "KiemThuGiaoDien.json").read_text(encoding="utf-8-sig"))
if not workflow["success"] or not statistics["success"] or not ui["success"]:
    raise SystemExit("Do not produce a successful-results chapter from failing checks.")
forecast = experiment["forecast"]
monthly = experiment["monthly"]
labels = [x["month"] for x in monthly] + [x["month"] for x in forecast["future"]]
position = {label: i for i, label in enumerate(labels)}
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 10, "axes.spines.top": False,
                     "axes.spines.right": False, "savefig.facecolor": "white"})

fig, ax = plt.subplots(figsize=(10.8, 5.4), layout="constrained")
ax.plot(range(len(monthly)), [x["count"] for x in monthly], label="Thực tế mô phỏng", color="#0369a1", linewidth=2)
ax.plot(range(len(monthly)), [x["value"] for x in experiment["trend"]["points"]], label="Hồi quy tuyến tính", color="#7c3aed", linestyle="--")
ax.plot([position[x["month"]] for x in forecast["validation"]], [x["predicted"] for x in forecast["validation"]], color="#d97706", marker="o", markersize=4, label="Dự báo tập kiểm tra")
ax.plot([position[x["month"]] for x in forecast["future"]], [x["predicted"] for x in forecast["future"]], color="#047857", marker="o", markersize=4, linestyle="--", label="Dự báo sau cuối chuỗi")
ax.axvspan(forecast["trainCount"] - .5, len(monthly) - .5, color="#fef3c7", alpha=.6, zorder=-1)
ax.axvline(forecast["trainCount"] - .5, color="#94a3b8", linewidth=1, linestyle=":")
ax.axvline(len(monthly) - .5, color="#94a3b8", linewidth=1, linestyle=":")
ticks = sorted(set(list(range(0, len(labels), 6)) + [len(labels) - 1]))
ax.set_xticks(ticks, [labels[i] for i in ticks], rotation=20, ha="right")
ax.set(xlabel="Tháng", ylabel="Số lượt khám mô phỏng", ylim=(0, None),
       title="Thực nghiệm Holt-Winters trên chuỗi lượt khám mô phỏng")
ax.grid(axis="y", alpha=.2)
ax.legend(frameon=False, ncols=2, loc="upper left", fontsize=9)
fig.savefig(BASE / "LuotKham_ThucTe_XuHuong_DuBao.png", dpi=240)
plt.close(fig)

fig, ax = plt.subplots(figsize=(9.2, 4.1), layout="constrained")
errors = [x["predicted"] - x["actual"] for x in forecast["validation"]]
ax.bar([x["month"] for x in forecast["validation"]], errors, color=["#d97706" if x >= 0 else "#0369a1" for x in errors], width=.6)
ax.axhline(0, color="#334155", linewidth=1)
ax.set(xlabel="Tháng kiểm tra", ylabel="Dự báo − thực tế (lượt)", title="Sai lệch trên tập kiểm tra của dữ liệu mô phỏng")
ax.grid(axis="y", alpha=.2)
fig.savefig(BASE / "SaiSo_TapKiemTra.png", dpi=240)
plt.close(fig)

def n(value, digits=2):
    if value is None:
        return "Không xác định"
    return f"{value:,.{digits}f}".replace(",", "_").replace(".", ",").replace("_", ".")

metrics = forecast["metrics"]
baseline = forecast["baselineMetrics"]
parameters = forecast["parameters"]
comparison = "thấp hơn" if metrics["rmse"] < baseline["rmse"] else "cao hơn hoặc bằng"
test_rows = "\n".join(f"| {x['month']} | {x['actual']} | {n(x['predicted'])} | {n(x['predicted']-x['actual'])} |" for x in forecast["validation"])
future_rows = "\n".join(f"| {x['month']} | {n(x['predicted'])} |" for x in forecast["future"])
chapter = f"""# Chương 3 Cài đặt và thực nghiệm

Phần thực nghiệm kiểm tra hai nội dung: quy trình khám ngoại trú qua API với dữ liệu kiểm thử riêng và mô hình thống kê/dự báo trên chuỗi mô phỏng xác định. Kết quả chạy thực tế được lưu kèm tệp JSON, CSV và hình minh họa để có thể đối chiếu và thực hiện lại.

## 3.1 Môi trường và dữ liệu thực nghiệm

Ứng dụng sử dụng React 19, ASP.NET Core Web API nhắm .NET 8, Entity Framework Core 9 và SQL Server 2022 Express. Bộ kiểm tra backend được biên dịch bằng .NET SDK 10.0.402 và chạy trên ASP.NET Core Runtime 8.0.33. Môi trường giao diện dùng Node.js 24.12.0; các hình trong phần này được tạo bằng Matplotlib {matplotlib.__version__}.

### 3.1.1 Dữ liệu database phát triển

Kết quả tổng hợp trong khoảng {live['from']} đến {live['to']} đọc {live['rawCount']} lượt nguồn, giữ {live['validCount']} lượt hợp lệ, loại {live['excludedCancelled']} lượt/hồ sơ hủy và {live['excludedInvalid']} lượt không hợp lệ. Trong nhóm không hợp lệ có {live['excludedReceptionOnly']} lượt nền tiếp đón chưa được phân phòng hoặc bác sĩ. Database này có dữ liệu demo, vì vậy các số liệu không được diễn giải là hoạt động của một phòng khám triển khai thực tế.

Mỗi ID lượt khám được đếm một lần. Các lượt nền của bước tiếp đón được loại để không cộng thêm một lượt khi thu ngân tạo hàng đợi theo phòng. Nguồn không nối với nhiều dòng đơn thuốc hoặc dịch vụ. Ngày thống kê lấy thời điểm bắt đầu khám, nếu thiếu thì lấy thời điểm tạo lượt.

Chuỗi đầu vào hiện có {len(live['monthly'])} tháng đầy đủ sau xử lý và điền các tháng trống trong phạm vi dữ liệu. Trạng thái dự báo trên database phát triển: **{'Có đủ điều kiện chạy' if live['forecastAvailable'] else 'Chưa đủ điều kiện chạy'}**. Thông báo trả về: {live['forecastMessage']} Việc tháng trống được điền 0 là giả định xử lý, cần được xác nhận khi dùng dữ liệu vận hành.

### 3.1.2 Dữ liệu mô phỏng dùng đánh giá thuật toán

Thực nghiệm sử dụng bộ sinh `synthetic-monthly-v1` gồm 36 tháng từ 01/2022 đến 12/2024. Dữ liệu được tạo xác định từ thành phần xu hướng, mùa vụ năm và biến động nhỏ; không chứa bệnh nhân thật. Bộ mô phỏng được lưu tại `DuBao_MoPhong_36Thang.json` và `DuBao_MoPhong_36Thang.csv`.

Dùng 30 tháng đầu (01/2022–06/2024) để huấn luyện và giữ riêng 6 tháng cuối (07/2024–12/2024) để kiểm tra. Các giá trị thực của tập kiểm tra không được dùng để khởi tạo, chọn tham số hoặc cập nhật mô hình dự báo tập kiểm tra. Sau đánh giá, mô hình được khớp lại trên đủ 36 tháng với tham số đã chọn để minh họa dự báo 6 tháng sau cuối chuỗi.

## 3.2 Kết quả cài đặt quy trình khám ngoại trú

Bộ kiểm tra tạo database mới từ SQL cấu trúc 58 bảng và seed tối thiểu, sau đó tạo các tài khoản quản trị, tiếp đón, bác sĩ, kỹ thuật viên và thu ngân. Toàn bộ bệnh nhân, thuốc, dịch vụ, giá và kết quả xét nghiệm trong ca kiểm tra đều là dữ liệu mô phỏng. Database kiểm thử được xóa khi kết thúc; database `DACN` đang dùng không bị ghi đè hoặc thêm dữ liệu khám.

Ca kiểm tra đi qua các bước tạo bệnh nhân, lưu hồ sơ và sinh hiệu, đăng ký dịch vụ, thu tiền khám, tạo hàng đợi, bác sĩ nhận khám, chỉ định cận lâm sàng, thanh toán cận lâm sàng, nhập/hoàn thành/duyệt/gửi kết quả PDF, kê đơn, kết luận và thanh toán thuốc.

Ca mô phỏng có phí khám 100.000 đồng, phí cận lâm sàng 50.000 đồng và phí thuốc 2.000 đồng. Kết quả kiểm tra xác nhận ba hóa đơn đều đã thu, tổng tiền bằng 152.000 đồng và tồn thuốc giảm đúng hai đơn vị. Các giá này chỉ phục vụ đối chiếu phần mềm, không phải bảng giá dịch vụ thực tế.

Trong quá trình kiểm tra, phần mềm được bổ sung việc truyền liên kết sinh hiệu từ lượt nền tiếp đón sang lượt theo phòng, nhận diện cận lâm sàng đã gửi là hoàn tất và loại lượt nền khỏi thống kê khám. Xuất PDF sử dụng đường dẫn webroot của ứng dụng và không phát sinh lỗi chỉ vì chưa có ảnh dấu/chữ ký.

## 3.3 Kết quả phân quyền và kiểm soát nghiệp vụ

API yêu cầu đăng nhập đối với hồ sơ khám, đơn thuốc, hóa đơn và xuất kết quả. Quyền thao tác khám bệnh, thanh toán và cận lâm sàng được đối chiếu theo vai trò và bảng quyền hiện tại trong database. Việc thu hồi vai trò có hiệu lực với các phân hệ được kiểm tra ngay cả khi JWT chưa hết hạn.

Các tình huống bị chặn gồm truy cập khi chưa đăng nhập, tiếp đón sửa quyền hoặc xác nhận thu tiền, thu ngân nhận chỉ định cận lâm sàng, tự gán ADMIN khi đăng ký công khai, bác sĩ khác chiếm lượt đã nhận, kỹ thuật viên khác sửa kết quả, thanh toán hóa đơn hai lần, thực hiện dịch vụ chưa thu tiền, gửi/sửa kết quả không đúng trạng thái và kết luận khi còn cận lâm sàng đang xử lý.

Đăng ký công khai chỉ tạo tài khoản chưa có vai trò. Quản trị viên cấp vai trò sau đó; giao diện đăng ký không tự chọn vai trò nghiệp vụ.

## 3.4 Kết quả thống kê và hồi quy tuyến tính

Phân hệ báo cáo tổng hợp lượt khám theo ngày/tháng, phân bố giờ, bác sĩ, chuyên khoa và nhóm ba ký tự đầu mã ICD của bệnh chính. Các trường chưa có thông tin được xếp vào nhóm chưa xác định. Thống kê giờ sử dụng giờ tạo lượt khi chưa có giờ bắt đầu khám, nên không được suy diễn thành thời gian chờ hoặc thời lượng khám.

Hồi quy OLS trên chuỗi mô phỏng có hệ số chặn a = {n(experiment['trend']['intercept'], 4)}, hệ số góc b = {n(experiment['trend']['slope'], 4)} lượt/tháng và R² = {n(experiment['trend']['rSquared'], 4)}. Nhãn xu hướng là **{experiment['trend']['direction']}**. Đây là mô tả toàn chuỗi, không phải kết quả kiểm định ý nghĩa thống kê và không dùng thay thế đánh giá ngoài mẫu của Holt-Winters.

![Lượt khám mô phỏng thực tế đường xu hướng và dự báo](LuotKham_ThucTe_XuHuong_DuBao.png)

Hình 3.1. Chuỗi mô phỏng, đường hồi quy, dự báo tập kiểm tra và các tháng sau cuối chuỗi. Vùng vàng biểu thị tập kiểm tra. Mốc dự báo minh họa là cuối năm 2024, không phải ngày lập báo cáo.

## 3.5 Kết quả dự báo Holt Winters

Mô hình sử dụng dạng cộng với mùa vụ 12 tháng. Các hệ số được chọn bằng tìm kiếm lưới trên tập huấn luyện: α = {parameters['alpha']}, β = {parameters['beta']}, γ = {parameters['gamma']}. Dự báo âm nếu phát sinh được giới hạn về 0 cho cả tập kiểm tra và phần dự báo tiếp theo. Không tạo dự báo khi tập huấn luyện chưa đủ 24 tháng.

| Mô hình | MAE (lượt) | RMSE (lượt) | MAPE (%) |
| --- | ---: | ---: | ---: |
| Holt-Winters cộng | {n(metrics['mae'], 4)} | {n(metrics['rmse'], 4)} | {n(metrics['mape'], 4)} |
| Cùng tháng năm trước (seasonal naive) | {n(baseline['mae'], 4)} | {n(baseline['rmse'], 4)} | {n(baseline['mape'], 4)} |

Trong thực nghiệm mô phỏng này, RMSE của Holt-Winters {comparison} mốc seasonal naive. MAPE được tính trên {metrics['mapeCount']} tháng có số lượt khác 0; có {metrics['zeroActualCount']} tháng bằng 0 bị loại riêng khỏi MAPE. MAE và RMSE vẫn dùng toàn bộ tập kiểm tra.

| Tháng kiểm tra | Thực tế mô phỏng | Dự báo | Dự báo trừ thực tế |
| --- | ---: | ---: | ---: |
{test_rows}

![Sai lệch dự báo trên tập kiểm tra mô phỏng](SaiSo_TapKiemTra.png)

Hình 3.2. Sai lệch từng tháng của dự báo trên tập kiểm tra. Giá trị dương là dự báo cao hơn thực tế mô phỏng, giá trị âm là dự báo thấp hơn.

| Tháng sau cuối chuỗi | Lượt dự báo mô phỏng |
| --- | ---: |
{future_rows}

Các sai số trên chỉ chứng minh thuật toán chạy và được đánh giá trên bộ dữ liệu đã công bố. Dữ liệu mô phỏng vốn được tạo có xu hướng và mùa vụ, do đó không dùng các chỉ số này để khẳng định mô hình chính xác tương tự trên dữ liệu phòng khám thật.

## 3.6 Kết quả kiểm thử và giới hạn

Bộ kiểm tra quy trình ghi nhận **{workflow['passed']} kiểm tra đạt**, lưu tại `KiemThuQuyTrinh.json`. Bộ kiểm tra thống kê, thuật toán và API ghi nhận **{statistics['passed']} kiểm tra đạt**, lưu tại `KiemThuThongKe.json`. Các kiểm tra bao gồm truy vấn SQL độc lập để đối chiếu số lượt và thử thay đổi tập kiểm tra để xác nhận không làm thay đổi tham số/dự báo của phần huấn luyện.

Giao diện có **{ui['passed']} kiểm tra thành phần React đạt** trong hai nhóm báo cáo và đăng ký tài khoản, lưu tóm tắt tại `KiemThuGiaoDien.json`. Các tình huống gồm thiếu lịch sử, lựa chọn mô phỏng, xuất theo bộ lọc đã áp dụng, lỗi API, quyền xuất, thông báo cấp vai trò sau đăng ký và xác nhận mật khẩu.

Đây là kiểm thử tích hợp qua HTTP với SQL Server cùng các kiểm thử thuật toán tự động, chưa thay thế nghiệm thu thao tác trực tiếp trên trình duyệt hoặc đánh giá triển khai tại phòng khám. Cần tiếp tục kiểm tra giao diện với người dùng theo từng vai trò, ngày vận hành thực tế và dữ liệu lịch sử đủ dài.

Giới hạn hiện tại gồm dữ liệu lịch sử còn ngắn, dữ liệu demo trong database phát triển, giả định tháng không có lượt tương ứng 0, chưa kiểm định mùa vụ năm, chỉ sử dụng mã bệnh chính và chưa có khoảng dự báo xác suất. Các tích hợp cổng thanh toán bên ngoài chưa được thực hiện giao dịch thật trong bộ kiểm tra này.

## Tái hiện kết quả

Từ thư mục gốc repo, chạy bộ kiểm tra quy trình trước và xuất thực nghiệm thống kê sau:

```powershell
dotnet run --project Tests/ClinicWorkflow.Checks/ClinicWorkflow.Checks.csproj
dotnet run --project Tests/VisitAnalytics.Checks/VisitAnalytics.Checks.csproj -- --database --export-experiment
cd Frontend/layout-dacn
npm test -- --watchAll=false --runInBand VisitAnalytics.test.jsx Registration.test.jsx
cd ../..
python -m pip install -r Docs/ThucNghiem/requirements-figures.txt
python Docs/ThucNghiem/tao_bieu_do.py
```

Môi trường cần có SQL Server Express tại máy local và quyền tạo/xóa database kiểm thử riêng. Lệnh thống kê dùng cấu hình kết nối backend và chỉ đọc dữ liệu phát triển; các file công bố chỉ chứa tổng hợp, không có bệnh nhân hoặc tên nhân viên.

## Tài liệu phương pháp

- Hyndman và Athanasopoulos, [Forecasting: Principles and Practice — Methods with seasonality](https://otexts.com/fpp3/exponential-smoothing.html#methods-with-seasonality).
- Hyndman và Athanasopoulos, [Evaluating point forecast accuracy](https://otexts.com/fpp3/toolbox.html#evaluating-point-forecast-accuracy).
"""
(BASE / "Chuong3_KetQuaThucNghiem.md").write_text(chapter, encoding="utf-8")
print("Created two figures and the results chapter from verified experiment outputs.")
