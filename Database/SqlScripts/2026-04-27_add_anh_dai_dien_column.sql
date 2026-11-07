USE [DACN];
GO

IF COL_LENGTH('dbo.nguoi_dung', 'anh_dai_dien') IS NULL
BEGIN
    ALTER TABLE dbo.nguoi_dung
        ADD anh_dai_dien NVARCHAR(500) NULL;
END
GO
