SET XACT_ABORT ON;
-- Neu chay bang sqlcmd, dung them -f 65001 de giu dung dau tieng Viet.

BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'dbo.benh', N'U') IS NULL
        THROW 52000, 'Khong tim thay bang dbo.benh.', 1;

    DECLARE @DanhMucBenh TABLE
    (
        ma VARCHAR(20) NOT NULL PRIMARY KEY,
        ten NVARCHAR(255) NOT NULL
    );

    INSERT INTO @DanhMucBenh (ma, ten)
    VALUES
        ('B006', N'Viêm họng cấp'),
        ('B007', N'Viêm amidan cấp'),
        ('B008', N'Viêm phế quản cấp'),
        ('B009', N'Viêm phổi'),
        ('B010', N'Cúm mùa'),
        ('B011', N'Sốt siêu vi'),
        ('B012', N'Rối loạn tiền đình'),
        ('B013', N'Đau nửa đầu'),
        ('B014', N'Đau thần kinh tọa'),
        ('B015', N'Thoái hóa cột sống'),
        ('B016', N'Viêm khớp'),
        ('B017', N'Đau dạ dày'),
        ('B018', N'Trào ngược dạ dày thực quản'),
        ('B019', N'Viêm đại tràng'),
        ('B020', N'Rối loạn tiêu hóa'),
        ('B021', N'Viêm gan B'),
        ('B022', N'Gan nhiễm mỡ'),
        ('B023', N'Nhiễm trùng tiểu'),
        ('B024', N'Sỏi thận'),
        ('B025', N'Viêm da cơ địa'),
        ('B026', N'Mề đay dị ứng'),
        ('B027', N'Thiếu máu'),
        ('B028', N'Rối loạn lipid máu'),
        ('B029', N'Cường giáp'),
        ('B030', N'Suy giáp'),
        ('B031', N'Đục thủy tinh thể'),
        ('B032', N'Viêm kết mạc'),
        ('B033', N'Viêm xoang'),
        ('B034', N'Viêm tai giữa'),
        ('B035', N'Chấn thương phần mềm');

    MERGE dbo.benh AS target
    USING @DanhMucBenh AS source
        ON UPPER(LTRIM(RTRIM(target.ma))) = source.ma
    WHEN MATCHED THEN
        UPDATE SET target.ten = source.ten
    WHEN NOT MATCHED THEN
        INSERT (ma, ten)
        VALUES (source.ma, source.ten);

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;
