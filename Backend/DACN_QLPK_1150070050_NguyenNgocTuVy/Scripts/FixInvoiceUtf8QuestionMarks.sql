USE DACN;
GO

SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;

-- Sua cac ban ghi demo cu bi mat dau tieng Viet do tung luu chuoi khong dung Unicode.
IF EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'lan_kham_dich_vu'
      AND COLUMN_NAME = 'ghi_chu'
      AND DATA_TYPE <> 'nvarchar'
)
BEGIN
    ALTER TABLE lan_kham_dich_vu ALTER COLUMN ghi_chu NVARCHAR(255) NULL;
END;

UPDATE benh_nhan
SET ho_ten = REPLACE(ho_ten, N'Nguy?n', N'Nguyễn')
WHERE ho_ten LIKE N'%Nguy?n%';

UPDATE phong_kham
SET ten_phong = REPLACE(ten_phong, N'S?n Ph? khoa', N'Sản Phụ khoa')
WHERE ten_phong LIKE N'%S?n Ph? khoa%';

UPDATE phong_kham
SET khoa_phong = REPLACE(khoa_phong, N'S?n Ph?', N'Sản Phụ')
WHERE khoa_phong LIKE N'%S?n Ph?%';

UPDATE chi_tiet_hoa_don
SET mo_ta = REPLACE(
             REPLACE(
             REPLACE(
             REPLACE(
             REPLACE(
             REPLACE(
             REPLACE(
             REPLACE(
             REPLACE(
             REPLACE(
             REPLACE(mo_ta,
                 N'Khám t?i ph?ng', N'Khám tại phòng'),
                 N'Khám t?i phòng', N'Khám tại phòng'),
                 N'Khám tại ph?ng', N'Khám tại phòng'),
                 N'Khám t?i Ph?ng', N'Khám tại Phòng'),
                 N'Ph?ng khám', N'Phòng khám'),
                 N'N?i t?ng quát', N'Nội tổng quát'),
                 N'Ngo?i th?n kinh', N'Ngoại thần kinh'),
                 N'Tai M?i H?ng', N'Tai Mũi Họng'),
                 N'Da Li?u', N'Da Liễu'),
                 N'N?i Ti?t', N'Nội Tiết'),
                 N'Răng Hàm M?t', N'Răng Hàm Mặt')
WHERE mo_ta LIKE N'%?%';

UPDATE lan_kham_dich_vu
SET ghi_chu = N'Kiểm tra máu tổng quát'
WHERE ghi_chu LIKE '%Ki?m tra máu t?ng quát%';

PRINT N'Da sua cac chuoi hoa don demo bi loi dau tieng Viet.';
