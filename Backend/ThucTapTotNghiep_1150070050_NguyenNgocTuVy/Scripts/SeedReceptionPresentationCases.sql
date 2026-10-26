SET NOCOUNT ON;
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;

DECLARE @Now datetime = GETDATE();
DECLARE @Today date = CONVERT(date, @Now);
DECLARE @ActorId bigint = COALESCE(
    (SELECT TOP 1 id FROM dbo.nguoi_dung WHERE ten_dang_nhap = 'recep1'),
    (SELECT MIN(id) FROM dbo.nguoi_dung)
);

DECLARE @AreaA int = (SELECT TOP 1 id FROM dbo.khu_tiep_don WHERE ma_khu = 'KHU_A' AND hoat_dong = 1);
DECLARE @AreaB int = (SELECT TOP 1 id FROM dbo.khu_tiep_don WHERE ma_khu = 'KHU_B' AND hoat_dong = 1);
DECLARE @CounterA int = (SELECT TOP 1 id FROM dbo.quay_tiep_don WHERE id_khu_tiep_don = @AreaA AND hoat_dong = 1 ORDER BY id);
DECLARE @CounterB int = (SELECT TOP 1 id FROM dbo.quay_tiep_don WHERE id_khu_tiep_don = @AreaB AND hoat_dong = 1 ORDER BY id);

IF @ActorId IS NULL OR @AreaA IS NULL OR @AreaB IS NULL OR @CounterA IS NULL OR @CounterB IS NULL
    THROW 51000, 'Thieu tai khoan tiep don hoac danh muc Khu A/Khu B/quay.', 1;

DECLARE @Patients TABLE
(
    ma_bn varchar(30) PRIMARY KEY,
    ho_ten nvarchar(100),
    ngay_sinh date,
    gioi_tinh varchar(10),
    cccd varchar(20),
    so_dien_thoai varchar(20),
    ghi_chu nvarchar(300)
);

INSERT INTO @Patients VALUES
('DEMO-TD-01', N'Nguyễn An Nhiên', '1994-04-12', 'Nu',  '079094000101', '0909000101', N'CASE 1 - Bệnh nhân mới, chưa có hồ sơ'),
('DEMO-TD-02', N'Trần Minh Khang', '1988-09-21', 'Nam', '079088000202', '0909000202', N'CASE 2 - Có hồ sơ active hôm nay tại Khu A'),
('DEMO-TD-03', N'Lê Hoàng Phúc',   '1979-02-15', 'Nam', '079079000303', '0909000303', N'CASE 3 - Có hồ sơ active hôm nay tại Khu B'),
('DEMO-TD-04', N'Phạm Thu Hà',     '1991-11-08', 'Nu',  '079091000404', '0909000404', N'CASE 4 - Hồ sơ hôm nay đã hủy, được tiếp đón lại'),
('DEMO-TD-05', N'Võ Đức Long',     '1985-06-30', 'Nam', '079085000505', '0909000505', N'CASE 5 - Đã khám xong hôm nay, tạo thêm lượt phải có lý do'),
('DEMO-TD-06', N'Bùi Ngọc Mai',    '1997-03-19', 'Nu',  '079097000606', '0909000606', N'CASE 6 - Dùng kiểm tra trùng CCCD'),
('DEMO-TD-07', N'Đặng Quốc Bảo',   '1990-12-25', 'Nam', '079090000707', '0909000707', N'CASE 7 - Dùng kiểm tra trùng số điện thoại');

BEGIN TRANSACTION;

UPDATE bn
SET bn.ho_ten = p.ho_ten,
    bn.ngay_sinh = p.ngay_sinh,
    bn.gioi_tinh = p.gioi_tinh,
    bn.cccd = p.cccd,
    bn.so_dien_thoai = p.so_dien_thoai,
    bn.email = CONCAT(LOWER(REPLACE(p.ma_bn, '-', '')), '@demo.local'),
    bn.quoc_tich = N'Việt Nam',
    bn.dan_toc = N'Kinh',
    bn.nghe_nghiep = N'Nhân viên văn phòng',
    bn.dia_chi_duong = N'123 Đường Demo',
    bn.dia_chi_xa = N'Phường Nghĩa Chánh',
    bn.dia_chi_huyen = N'Thành phố Quảng Ngãi',
    bn.dia_chi_tinh = N'Quảng Ngãi',
    bn.quoc_gia = N'Việt Nam',
    bn.ghi_chu_dinh_danh = p.ghi_chu,
    bn.is_potential_duplicate = 0,
    bn.updated_at = @Now
FROM dbo.benh_nhan bn
JOIN @Patients p ON p.ma_bn = bn.ma_bn;

INSERT dbo.benh_nhan
(
    ma_bn, ho_ten, ngay_sinh, gioi_tinh, cccd, so_dien_thoai, email,
    quoc_tich, dan_toc, nghe_nghiep, dia_chi_duong, dia_chi_xa,
    dia_chi_huyen, dia_chi_tinh, quoc_gia, ghi_chu_dinh_danh,
    is_potential_duplicate, created_at, updated_at
)
SELECT
    p.ma_bn, p.ho_ten, p.ngay_sinh, p.gioi_tinh, p.cccd, p.so_dien_thoai,
    CONCAT(LOWER(REPLACE(p.ma_bn, '-', '')), '@demo.local'),
    N'Việt Nam', N'Kinh', N'Nhân viên văn phòng', N'123 Đường Demo',
    N'Phường Nghĩa Chánh', N'Thành phố Quảng Ngãi', N'Quảng Ngãi', N'Việt Nam',
    p.ghi_chu, 0, @Now, @Now
FROM @Patients p
WHERE NOT EXISTS (SELECT 1 FROM dbo.benh_nhan bn WHERE bn.ma_bn = p.ma_bn);

DECLARE @Encounters TABLE
(
    ma_bn varchar(30), ma_hs varchar(30), reception_time datetime,
    trang_thai varchar(30), id_khu int, id_quay int, ly_do nvarchar(200)
);

INSERT INTO @Encounters VALUES
('DEMO-TD-02', 'HS-DEMO-TD-02', DATEADD(minute, 8 * 60 + 5, CONVERT(datetime, @Today)), 'DA_TIEP_DON', @AreaA, @CounterA, N'Đau đầu, chóng mặt'),
('DEMO-TD-03', 'HS-DEMO-TD-03', DATEADD(minute, 8 * 60 + 20, CONVERT(datetime, @Today)), 'DA_TIEP_DON', @AreaB, @CounterB, N'Đau bụng âm ỉ'),
('DEMO-TD-04', 'HS-DEMO-TD-04', DATEADD(minute, 7 * 60 + 45, CONVERT(datetime, @Today)), 'DA_HUY', @AreaB, @CounterB, N'Đã hủy để demo tiếp đón lại'),
('DEMO-TD-05', 'HS-DEMO-TD-05', DATEADD(minute, 7 * 60 + 30, CONVERT(datetime, @Today)), 'DA_DONG', @AreaA, @CounterA, N'Đã hoàn tất khám trong ngày');

UPDATE hs
SET hs.id_benh_nhan = bn.id,
    hs.ngay_tao = e.reception_time,
    hs.id_nguoi_tao = @ActorId,
    hs.trang_thai = e.trang_thai,
    hs.id_khu_tiep_don = e.id_khu,
    hs.id_quay_tiep_don = e.id_quay,
    hs.ghi_chu = CONCAT(N'[RECEPTION_META]{"sourceType":"Trực tiếp","visitType":"Khám mới","reasonForVisit":"', e.ly_do, N'","priority":"Thường","paymentObject":"Tự phí","receptionNote":"Dữ liệu thuyết trình"}'),
    hs.UpdatedAt = @Now
FROM dbo.ho_so_benh_an hs
JOIN @Encounters e ON e.ma_hs = hs.ma_hs
JOIN dbo.benh_nhan bn ON bn.ma_bn = e.ma_bn;

INSERT dbo.ho_so_benh_an
(id_benh_nhan, ma_hs, ngay_tao, id_nguoi_tao, ghi_chu, trang_thai, UpdatedAt, id_khu_tiep_don, id_quay_tiep_don)
SELECT bn.id, e.ma_hs, e.reception_time, @ActorId,
       CONCAT(N'[RECEPTION_META]{"sourceType":"Trực tiếp","visitType":"Khám mới","reasonForVisit":"', e.ly_do, N'","priority":"Thường","paymentObject":"Tự phí","receptionNote":"Dữ liệu thuyết trình"}'),
       e.trang_thai, @Now, e.id_khu, e.id_quay
FROM @Encounters e
JOIN dbo.benh_nhan bn ON bn.ma_bn = e.ma_bn
WHERE NOT EXISTS (SELECT 1 FROM dbo.ho_so_benh_an hs WHERE hs.ma_hs = e.ma_hs);

COMMIT TRANSACTION;

SELECT p.ghi_chu AS test_case, bn.ma_bn, bn.ho_ten, bn.cccd, bn.so_dien_thoai,
       hs.ma_hs, hs.trang_thai, hs.ngay_tao, k.ten_khu, q.ten_quay
FROM @Patients p
JOIN dbo.benh_nhan bn ON bn.ma_bn = p.ma_bn
LEFT JOIN dbo.ho_so_benh_an hs ON hs.ma_hs = REPLACE(p.ma_bn, 'DEMO-', 'HS-DEMO-')
LEFT JOIN dbo.khu_tiep_don k ON k.id = hs.id_khu_tiep_don
LEFT JOIN dbo.quay_tiep_don q ON q.id = hs.id_quay_tiep_don
ORDER BY p.ma_bn;
