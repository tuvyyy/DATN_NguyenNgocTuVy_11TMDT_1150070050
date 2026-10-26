# Kết quả thực nghiệm và kiểm thử

[Nội dung Chương 3](Chuong3_KetQuaThucNghiem.md) được tạo từ các kết quả chạy tự động kèm theo. Bản này dùng để đối chiếu và đưa vào báo cáo đồ án; dữ liệu mô phỏng được ghi rõ, không trình bày thành số liệu của phòng khám triển khai thực tế.

| Tệp | Nội dung |
| --- | --- |
| [KiemThuQuyTrinh.json](KiemThuQuyTrinh.json) | Kết quả từng bước kiểm thử ca khám, phân quyền và nhánh sai trên database tạm. |
| [KiemThuThongKe.json](KiemThuThongKe.json) | Số kiểm tra thuật toán/thống kê/API đã qua và thời điểm chạy. |
| [KiemThuGiaoDien.json](KiemThuGiaoDien.json) | Tóm tắt kết quả kiểm tra thành phần React cho báo cáo và đăng ký. |
| [DuLieuHienTai_TongHop.json](DuLieuHienTai_TongHop.json) | Chỉ số tổng hợp từ database phát triển, không có bệnh nhân hoặc tên nhân viên. |
| [DuBao_MoPhong_36Thang.json](DuBao_MoPhong_36Thang.json) | Toàn bộ cấu hình, chuỗi tháng, hồi quy, dự báo, MAE/RMSE/MAPE trên dữ liệu mô phỏng. |
| [DuBao_MoPhong_36Thang.csv](DuBao_MoPhong_36Thang.csv) | Chuỗi tháng và dự báo dạng bảng để mở trong Excel. |
| [LuotKham_ThucTe_XuHuong_DuBao.png](LuotKham_ThucTe_XuHuong_DuBao.png) | Biểu đồ thực nghiệm mô phỏng độ phân giải cao. |
| [SaiSo_TapKiemTra.png](SaiSo_TapKiemTra.png) | Biểu đồ sai lệch từng tháng kiểm tra. |

## Chạy lại toàn bộ

Môi trường cần .NET SDK/ASP.NET Core Runtime 8, SQL Server Express local tại `.\SQLEXPRESS`, Python và quyền tạo database kiểm thử. Bộ kiểm tra quy trình tự tạo tên `DACN_E2E_<mã ngẫu nhiên>`, dựng schema sạch, chạy ca mô phỏng rồi xóa đúng database vừa tạo. Nó không chép dữ liệu bệnh nhân từ `DACN` và không dùng cổng thanh toán thật.

Từ thư mục gốc repo:

```powershell
dotnet run --project Tests/ClinicWorkflow.Checks/ClinicWorkflow.Checks.csproj
dotnet run --project Tests/VisitAnalytics.Checks/VisitAnalytics.Checks.csproj -- --database --export-experiment
python -m pip install -r Docs/ThucNghiem/requirements-figures.txt
python Docs/ThucNghiem/tao_bieu_do.py
```

Hai lệnh Python chỉ tạo hình và nội dung báo cáo từ kết quả đã xuất. Script dừng nếu tệp kết quả kiểm thử ghi nhận thất bại. Bản tổng hợp database thay đổi khi dữ liệu phát triển thay đổi, còn bộ mô phỏng 36 tháng cố định từ 2022-01 đến 2024-12.

Kiểm tra giao diện:

```powershell
cd Frontend/layout-dacn
$env:CI = 'true'
npm test -- --watchAll=false --runInBand VisitAnalytics.test.jsx Registration.test.jsx
npm run build
```

Kiểm tra tự động qua HTTP và các thành phần React không thay thế toàn bộ nghiệm thu thao tác trên trình duyệt. Trước bảo vệ, cần đối chiếu màn hình demo với bản dữ liệu sẽ trình bày và giữ nguyên cách ghi nhãn mô phỏng.
