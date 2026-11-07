SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'dbo.khu_tiep_don', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.khu_tiep_don
        (
            id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_khu_tiep_don PRIMARY KEY,
            ma_khu VARCHAR(30) NOT NULL,
            ten_khu NVARCHAR(150) NOT NULL,
            mo_ta NVARCHAR(500) NULL,
            hoat_dong BIT NOT NULL CONSTRAINT DF_khu_tiep_don_hoat_dong DEFAULT (1),
            created_at DATETIME NOT NULL CONSTRAINT DF_khu_tiep_don_created DEFAULT (GETDATE()),
            updated_at DATETIME NULL
        );
    END;

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_khu_tiep_don_ma' AND object_id = OBJECT_ID(N'dbo.khu_tiep_don'))
        CREATE UNIQUE INDEX UX_khu_tiep_don_ma ON dbo.khu_tiep_don(ma_khu);

    IF OBJECT_ID(N'dbo.quay_tiep_don', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.quay_tiep_don
        (
            id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_quay_tiep_don PRIMARY KEY,
            id_khu_tiep_don INT NOT NULL,
            ma_quay VARCHAR(30) NOT NULL,
            ten_quay NVARCHAR(150) NOT NULL,
            thu_tu INT NULL,
            hoat_dong BIT NOT NULL CONSTRAINT DF_quay_tiep_don_hoat_dong DEFAULT (1),
            created_at DATETIME NOT NULL CONSTRAINT DF_quay_tiep_don_created DEFAULT (GETDATE()),
            updated_at DATETIME NULL
        );
    END;

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_quay_tiep_don_khu_ma' AND object_id = OBJECT_ID(N'dbo.quay_tiep_don'))
        CREATE UNIQUE INDEX UX_quay_tiep_don_khu_ma ON dbo.quay_tiep_don(id_khu_tiep_don, ma_quay);

    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_quay_tiep_don_khu')
        ALTER TABLE dbo.quay_tiep_don
            ADD CONSTRAINT FK_quay_tiep_don_khu
            FOREIGN KEY (id_khu_tiep_don) REFERENCES dbo.khu_tiep_don(id);

    IF OBJECT_ID(N'dbo.nguoi_dung_khu', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.nguoi_dung_khu
        (
            id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_nguoi_dung_khu PRIMARY KEY,
            id_nguoi_dung BIGINT NOT NULL,
            id_khu_tiep_don INT NOT NULL,
            la_mac_dinh BIT NOT NULL CONSTRAINT DF_nguoi_dung_khu_mac_dinh DEFAULT (0),
            hoat_dong BIT NOT NULL CONSTRAINT DF_nguoi_dung_khu_hoat_dong DEFAULT (1),
            created_at DATETIME NOT NULL CONSTRAINT DF_nguoi_dung_khu_created DEFAULT (GETDATE())
        );
    END;

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_nguoi_dung_khu_user_khu' AND object_id = OBJECT_ID(N'dbo.nguoi_dung_khu'))
        CREATE UNIQUE INDEX UX_nguoi_dung_khu_user_khu ON dbo.nguoi_dung_khu(id_nguoi_dung, id_khu_tiep_don);

    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_nguoi_dung_khu_user')
        ALTER TABLE dbo.nguoi_dung_khu
            ADD CONSTRAINT FK_nguoi_dung_khu_user
            FOREIGN KEY (id_nguoi_dung) REFERENCES dbo.nguoi_dung(id) ON DELETE CASCADE;

    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_nguoi_dung_khu_khu')
        ALTER TABLE dbo.nguoi_dung_khu
            ADD CONSTRAINT FK_nguoi_dung_khu_khu
            FOREIGN KEY (id_khu_tiep_don) REFERENCES dbo.khu_tiep_don(id) ON DELETE CASCADE;

    IF COL_LENGTH('dbo.ho_so_benh_an', 'id_khu_tiep_don') IS NULL
        ALTER TABLE dbo.ho_so_benh_an ADD id_khu_tiep_don INT NULL;

    IF COL_LENGTH('dbo.ho_so_benh_an', 'id_quay_tiep_don') IS NULL
        ALTER TABLE dbo.ho_so_benh_an ADD id_quay_tiep_don INT NULL;

    IF COL_LENGTH('dbo.phong_kham', 'id_khu_tiep_don') IS NULL
        ALTER TABLE dbo.phong_kham ADD id_khu_tiep_don INT NULL;

    IF COL_LENGTH('dbo.phong_thuc_hien', 'id_khu_tiep_don') IS NULL
        ALTER TABLE dbo.phong_thuc_hien ADD id_khu_tiep_don INT NULL;

    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_ho_so_benh_an_khu_tiep_don')
        ALTER TABLE dbo.ho_so_benh_an
            ADD CONSTRAINT FK_ho_so_benh_an_khu_tiep_don
            FOREIGN KEY (id_khu_tiep_don) REFERENCES dbo.khu_tiep_don(id);

    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_ho_so_benh_an_quay_tiep_don')
        ALTER TABLE dbo.ho_so_benh_an
            ADD CONSTRAINT FK_ho_so_benh_an_quay_tiep_don
            FOREIGN KEY (id_quay_tiep_don) REFERENCES dbo.quay_tiep_don(id);

    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_phong_kham_khu_tiep_don')
        ALTER TABLE dbo.phong_kham
            ADD CONSTRAINT FK_phong_kham_khu_tiep_don
            FOREIGN KEY (id_khu_tiep_don) REFERENCES dbo.khu_tiep_don(id);

    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_phong_thuc_hien_khu_tiep_don')
        ALTER TABLE dbo.phong_thuc_hien
            ADD CONSTRAINT FK_phong_thuc_hien_khu_tiep_don
            FOREIGN KEY (id_khu_tiep_don) REFERENCES dbo.khu_tiep_don(id);

    MERGE dbo.khu_tiep_don AS target
    USING (VALUES
        ('KHU_A', N'Khu A', N'Khu tiếp đón mặc định'),
        ('KHU_B', N'Khu B', N'Khu tiếp đón/khám ngoại trú B'),
        ('KHU_C', N'Khu C', N'Khu tiếp đón/khám ngoại trú C'),
        ('KHU_D', N'Khu D', N'Khu tiếp đón/khám ngoại trú D'),
        ('CAP_CUU', N'Cấp cứu', N'Khu cấp cứu')
    ) AS source(ma_khu, ten_khu, mo_ta)
    ON target.ma_khu = source.ma_khu
    WHEN MATCHED THEN
        UPDATE SET ten_khu = source.ten_khu, mo_ta = source.mo_ta, hoat_dong = 1, updated_at = GETDATE()
    WHEN NOT MATCHED THEN
        INSERT (ma_khu, ten_khu, mo_ta, hoat_dong)
        VALUES (source.ma_khu, source.ten_khu, source.mo_ta, 1);

    DECLARE @khuA INT = (SELECT id FROM dbo.khu_tiep_don WHERE ma_khu = 'KHU_A');
    DECLARE @khuB INT = (SELECT id FROM dbo.khu_tiep_don WHERE ma_khu = 'KHU_B');
    DECLARE @khuC INT = (SELECT id FROM dbo.khu_tiep_don WHERE ma_khu = 'KHU_C');
    DECLARE @khuD INT = (SELECT id FROM dbo.khu_tiep_don WHERE ma_khu = 'KHU_D');
    DECLARE @capCuu INT = (SELECT id FROM dbo.khu_tiep_don WHERE ma_khu = 'CAP_CUU');

    IF @khuA IS NULL OR @khuB IS NULL OR @khuC IS NULL OR @khuD IS NULL OR @capCuu IS NULL
        THROW 51000, 'Khong seed duoc danh muc khu tiep don.', 1;

    MERGE dbo.quay_tiep_don AS target
    USING (VALUES
        (@khuA, 'A-Q01', N'Quầy A.01', 1),
        (@khuA, 'A-Q02', N'Quầy A.02', 2),
        (@khuB, 'B-Q01', N'Quầy B.01', 1),
        (@khuB, 'B-Q02', N'Quầy B.02', 2),
        (@khuC, 'C-Q01', N'Quầy C.01', 1),
        (@khuD, 'D-Q01', N'Quầy D.01', 1),
        (@capCuu, 'CC-Q01', N'Quầy cấp cứu', 1)
    ) AS source(id_khu_tiep_don, ma_quay, ten_quay, thu_tu)
    ON target.id_khu_tiep_don = source.id_khu_tiep_don AND target.ma_quay = source.ma_quay
    WHEN MATCHED THEN
        UPDATE SET ten_quay = source.ten_quay, thu_tu = source.thu_tu, hoat_dong = 1, updated_at = GETDATE()
    WHEN NOT MATCHED THEN
        INSERT (id_khu_tiep_don, ma_quay, ten_quay, thu_tu, hoat_dong)
        VALUES (source.id_khu_tiep_don, source.ma_quay, source.ten_quay, source.thu_tu, 1);

    EXEC sys.sp_executesql N'
        UPDATE pk
        SET id_khu_tiep_don =
            CASE
                WHEN UPPER(ISNULL(pk.ma_phong, '''')) LIKE ''%KHU_B%''
                    OR UPPER(ISNULL(pk.ma_phong, '''')) LIKE ''B-%''
                    OR UPPER(ISNULL(pk.ma_phong, '''')) LIKE ''B.%''
                    OR pk.ten_phong LIKE N''%Khu B%''
                    OR pk.khoa_phong LIKE N''%Khu B%'' THEN @khuB
                WHEN UPPER(ISNULL(pk.ma_phong, '''')) LIKE ''%KHU_C%''
                    OR UPPER(ISNULL(pk.ma_phong, '''')) LIKE ''C-%''
                    OR UPPER(ISNULL(pk.ma_phong, '''')) LIKE ''C.%''
                    OR pk.ten_phong LIKE N''%Khu C%''
                    OR pk.khoa_phong LIKE N''%Khu C%'' THEN @khuC
                WHEN UPPER(ISNULL(pk.ma_phong, '''')) LIKE ''%KHU_D%''
                    OR UPPER(ISNULL(pk.ma_phong, '''')) LIKE ''D-%''
                    OR UPPER(ISNULL(pk.ma_phong, '''')) LIKE ''D.%''
                    OR pk.ten_phong LIKE N''%Khu D%''
                    OR pk.khoa_phong LIKE N''%Khu D%'' THEN @khuD
                WHEN pk.ten_phong LIKE N''%cấp cứu%''
                    OR pk.khoa_phong LIKE N''%cấp cứu%''
                    OR UPPER(ISNULL(pk.ma_phong, '''')) LIKE ''%CAP_CUU%'' THEN @capCuu
                ELSE @khuA
            END
        FROM dbo.phong_kham pk
        WHERE pk.id_khu_tiep_don IS NULL;',
        N'@khuA INT, @khuB INT, @khuC INT, @khuD INT, @capCuu INT',
        @khuA = @khuA, @khuB = @khuB, @khuC = @khuC, @khuD = @khuD, @capCuu = @capCuu;

    EXEC sys.sp_executesql N'
        UPDATE pth
        SET id_khu_tiep_don =
            CASE
                WHEN pth.ten_phong LIKE N''%Khu B%'' THEN @khuB
                WHEN pth.ten_phong LIKE N''%Khu C%'' THEN @khuC
                WHEN pth.ten_phong LIKE N''%Khu D%'' THEN @khuD
                WHEN pth.ten_phong LIKE N''%cấp cứu%'' THEN @capCuu
                ELSE @khuA
            END
        FROM dbo.phong_thuc_hien pth
        WHERE pth.id_khu_tiep_don IS NULL;',
        N'@khuA INT, @khuB INT, @khuC INT, @khuD INT, @capCuu INT',
        @khuA = @khuA, @khuB = @khuB, @khuC = @khuC, @khuD = @khuD, @capCuu = @capCuu;

    EXEC sys.sp_executesql N'
        UPDATE hs
        SET id_khu_tiep_don = @khuA,
            id_quay_tiep_don = (
                SELECT TOP 1 id
                FROM dbo.quay_tiep_don
                WHERE id_khu_tiep_don = @khuA
                ORDER BY ISNULL(thu_tu, 2147483647), ma_quay
            )
        FROM dbo.ho_so_benh_an hs
        WHERE hs.id_khu_tiep_don IS NULL;',
        N'@khuA INT',
        @khuA = @khuA;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;
