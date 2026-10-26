# Kịch bản demo nghiệp vụ tiếp đón

Ngày chuẩn bị: 15/07/2026. Dữ liệu dùng tiền tố `DEMO-TD`; không dùng CCCD/SĐT thật.

## Thứ tự demo đề xuất

### 1. Bệnh nhân mới — lưu thành công

- Họ tên: Nguyễn An Nhiên
- CCCD: `079094000101`
- SĐT: `0909000101`
- Mã BN: `DEMO-TD-01`
- Trạng thái ban đầu: chưa có hồ sơ.
- Thao tác: nhập CCCD, bổ sung thông tin tiếp đón, chọn khu/quầy rồi lưu.
- Kết quả mong đợi: tạo hồ sơ mới thành công; bấm lưu lặp lại không tạo hồ sơ thứ hai.

### 2. Trùng hồ sơ active cùng khu

- Họ tên: Trần Minh Khang
- CCCD: `079088000202`
- SĐT: `0909000202`
- Hồ sơ: `HS-DEMO-TD-02`, Khu A — Quầy A.01, lúc 08:05 hôm nay.
- Thao tác: đứng ở Khu A, nhập CCCD.
- Kết quả mong đợi: hệ thống nạp đúng hồ sơ đang active; không tạo hồ sơ mới.

### 3. Hồ sơ active ở khu khác — bắt buộc khu cũ hủy

- Họ tên: Lê Hoàng Phúc
- CCCD: `079079000303`
- SĐT: `0909000303`
- Hồ sơ: `HS-DEMO-TD-03`, Khu B — Quầy B.01, lúc 08:20 hôm nay.
- Thao tác: chọn Khu A trước, sau đó nhập CCCD và thử lưu.
- Kết quả mong đợi: cảnh báo rõ mã hồ sơ, ngày/giờ, Khu B; Khu A bị chặn tiếp đón.
- Bước tiếp: tại Khu B hủy `HS-DEMO-TD-03` với lý do phù hợp; quay lại Khu A tra cứu và tiếp đón.

### 4. Hồ sơ khu khác đã hủy — được tiếp đón lại

- Họ tên: Phạm Thu Hà
- CCCD: `079091000404`
- SĐT: `0909000404`
- Hồ sơ cũ: `HS-DEMO-TD-04`, trạng thái `DA_HUY`, Khu B.
- Thao tác: chọn Khu A, nhập CCCD và lưu tiếp đón.
- Kết quả mong đợi: không bị chặn bởi hồ sơ đã hủy.

### 5. Đã khám xong trong ngày — bắt lý do tạo thêm lượt

- Họ tên: Võ Đức Long
- CCCD: `079085000505`
- SĐT: `0909000505`
- Hồ sơ cũ: `HS-DEMO-TD-05`, trạng thái `DA_DONG`, Khu A.
- Thao tác: nhập CCCD rồi thử tạo lượt mới khi chưa điền “Lý do tạo thêm lượt trong ngày”.
- Kết quả mong đợi: hệ thống yêu cầu lý do. Điền `Tái khám do triệu chứng tái phát` rồi lưu lại.

### 6. Tra cứu/chặn trùng CCCD

- Bệnh nhân gốc: Bùi Ngọc Mai
- CCCD: `079097000606`
- SĐT: `0909000606`
- Thao tác: nhập CCCD trên form bệnh nhân mới.
- Kết quả mong đợi: hệ thống tìm và nạp bệnh nhân gốc. API cũng chặn nếu cố gán CCCD này cho bệnh nhân khác.

### 7. Tra cứu/chặn trùng số điện thoại

- Bệnh nhân gốc: Đặng Quốc Bảo
- CCCD: `079090000707`
- SĐT: `0909000707`
- Thao tác: nhập SĐT trên form.
- Kết quả mong đợi: hệ thống tìm đúng bệnh nhân; API chặn nếu cố gán SĐT này cho bệnh nhân khác.

## Khôi phục dữ liệu theo ngày

Trước khi thuyết trình có thể chạy lại:

```powershell
sqlcmd -S ".\SQLEXPRESS" -d DACN -E -C -i "Backend\ThucTapTotNghiep_1150070050_NguyenNgocTuVy\Scripts\SeedReceptionPresentationCases.sql"
```

Script có thể chạy lặp lại: thông tin bệnh nhân được cập nhật và bốn hồ sơ mẫu được đưa về đúng ngày/trạng thái demo.
