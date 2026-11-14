# BÁO CÁO TIẾN ĐỘ KHÓA LUẬN TỐT NGHIỆP

**Sinh viên:** Nguyễn Ngọc Tú Vy — MSSV 1150070050

**Đề tài:** Xây dựng hệ thống quản lý phòng khám

## I. Cơ sở dữ liệu

Hệ thống sử dụng SQL Server, hiện có **58 bảng**. Báo cáo tập trung **14 bảng nghiệp vụ chính**, thuộc bốn nhóm: bệnh nhân và hồ sơ khám; dịch vụ và cận lâm sàng; thuốc và đơn thuốc; hóa đơn và chi tiết thanh toán.

[Phụ lục CSDL trọng tâm](PHU_LUC_CSDL_HIEN_TAI.md) trình bày ba dòng dữ liệu đang lưu cho mỗi bảng được chọn.

## II. Nghiệp vụ chính

1. **Tiếp đón:** Tra cứu/tạo bệnh nhân, lập hồ sơ và ghi sinh hiệu.
2. **Đăng ký và thu phí khám:** Chọn dịch vụ, phòng khám; thanh toán để vào hàng đợi bác sĩ.
3. **Khám bệnh:** Bác sĩ xem hồ sơ, ghi nhận triệu chứng, chẩn đoán và chỉ định cận lâm sàng nếu cần.
4. **Cận lâm sàng:** Thu phí chỉ định → thực hiện → nhập, duyệt và trả kết quả cho bác sĩ.
5. **Kết thúc khám:** Bác sĩ đọc kết quả, kết luận, kê đơn và hẹn tái khám khi cần; thu tiền thuốc nếu phát sinh.
6. **Báo cáo:** Thống kê lượt khám và dự báo nhu cầu các tháng tiếp theo.

**Demo:** 1 → 2 → 3 → 4 (nếu có chỉ định) → 5 → 6. Trường hợp không chỉ định cận lâm sàng, chuyển từ bước 3 sang bước 5.

## III. Bài toán dự báo

Dự báo **số lượt khám theo tháng trong 6 tháng tiếp theo**, hỗ trợ bố trí nhân sự và phòng khám. Dữ liệu lấy từ `lan_kham`, tổng hợp lượt hợp lệ theo các tháng đã kết thúc.

Sử dụng **Holt-Winters dạng cộng**, chu kỳ 12 tháng; đã triển khai trong code. Mặc định cần ít nhất 30 tháng dữ liệu: 24 tháng huấn luyện và 6 tháng kiểm tra; đánh giá bằng MAE, RMSE, MAPE. Dữ liệu demo được ghi nhãn khi thực nghiệm.
