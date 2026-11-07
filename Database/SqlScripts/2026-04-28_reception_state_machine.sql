USE [DACN];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.tiepdon_trangthai_logs', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.tiepdon_trangthai_logs
    (
        id BIGINT IDENTITY(1,1) NOT NULL,
        id_ho_so BIGINT NOT NULL,
        from_trang_thai VARCHAR(30) NULL,
        to_trang_thai VARCHAR(30) NOT NULL,
        action VARCHAR(80) NOT NULL,
        note NVARCHAR(500) NULL,
        id_nguoi_dung BIGINT NULL,
        created_at DATETIME NOT NULL CONSTRAINT DF_tiepdon_trangthai_logs_created_at DEFAULT (GETDATE()),
        metadata NVARCHAR(MAX) NULL,
        CONSTRAINT PK_tiepdon_trangthai_logs PRIMARY KEY CLUSTERED (id)
    );

    ALTER TABLE dbo.tiepdon_trangthai_logs
        ADD CONSTRAINT FK_tiepdon_trangthai_logs_ho_so
            FOREIGN KEY (id_ho_so) REFERENCES dbo.ho_so_benh_an(id) ON DELETE CASCADE;

    ALTER TABLE dbo.tiepdon_trangthai_logs
        ADD CONSTRAINT FK_tiepdon_trangthai_logs_nguoi_dung
            FOREIGN KEY (id_nguoi_dung) REFERENCES dbo.nguoi_dung(id);

    CREATE INDEX IX_tiepdon_trangthai_logs_hoso_time
        ON dbo.tiepdon_trangthai_logs(id_ho_so, created_at DESC);
END
GO

IF COL_LENGTH('dbo.ho_so_benh_an', 'ngay_tao_date') IS NULL
BEGIN
    ALTER TABLE dbo.ho_so_benh_an
        ADD ngay_tao_date AS CONVERT(date, ngay_tao) PERSISTED;
END
GO

IF EXISTS
(
    SELECT 1
    FROM dbo.ho_so_benh_an h
    WHERE h.id_benh_nhan IS NOT NULL
      AND h.ngay_tao IS NOT NULL
      AND (h.trang_thai IS NULL OR (h.trang_thai <> 'HUY' AND h.trang_thai <> 'DA_HUY'))
    GROUP BY h.id_benh_nhan, CONVERT(date, h.ngay_tao)
    HAVING COUNT(1) > 1
)
BEGIN
    PRINT N'[WARN] Co du lieu trung ho so benh nhan-ngay (active). Can xu ly du lieu truoc khi tao unique index UX_ho_so_benh_an_bn_day_active.';
END
ELSE
BEGIN
    DECLARE @needRecreateActiveIdx BIT = 0;
    IF EXISTS
    (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID('dbo.ho_so_benh_an')
          AND name = 'UX_ho_so_benh_an_bn_day_active'
          AND (
                filter_definition IS NULL
                OR filter_definition NOT LIKE '%DA_HUY%'
              )
    )
    BEGIN
        SET @needRecreateActiveIdx = 1;
    END

    IF @needRecreateActiveIdx = 1
    BEGIN
        DROP INDEX UX_ho_so_benh_an_bn_day_active ON dbo.ho_so_benh_an;
    END

    IF NOT EXISTS
    (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID('dbo.ho_so_benh_an')
          AND name = 'UX_ho_so_benh_an_bn_day_active'
    )
    BEGIN
        CREATE UNIQUE NONCLUSTERED INDEX UX_ho_so_benh_an_bn_day_active
            ON dbo.ho_so_benh_an(id_benh_nhan, ngay_tao_date)
            WHERE id_benh_nhan IS NOT NULL
              AND ngay_tao IS NOT NULL
              AND (trang_thai IS NULL OR (trang_thai <> 'HUY' AND trang_thai <> 'DA_HUY'));
    END
END
GO
