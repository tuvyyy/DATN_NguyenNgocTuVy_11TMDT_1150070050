USE [DACN];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF COL_LENGTH('dbo.benh_nhan', 'nguoi_lien_he_khan_cap') IS NULL
    ALTER TABLE dbo.benh_nhan ADD nguoi_lien_he_khan_cap NVARCHAR(120) NULL;
IF COL_LENGTH('dbo.benh_nhan', 'sdt_lien_he_khan_cap') IS NULL
    ALTER TABLE dbo.benh_nhan ADD sdt_lien_he_khan_cap VARCHAR(20) NULL;
IF COL_LENGTH('dbo.benh_nhan', 'quan_he_lien_he_khan_cap') IS NULL
    ALTER TABLE dbo.benh_nhan ADD quan_he_lien_he_khan_cap NVARCHAR(60) NULL;
IF COL_LENGTH('dbo.benh_nhan', 'nguoi_giam_ho') IS NULL
    ALTER TABLE dbo.benh_nhan ADD nguoi_giam_ho NVARCHAR(120) NULL;
IF COL_LENGTH('dbo.benh_nhan', 'sdt_giam_ho') IS NULL
    ALTER TABLE dbo.benh_nhan ADD sdt_giam_ho VARCHAR(20) NULL;
IF COL_LENGTH('dbo.benh_nhan', 'quan_he_giam_ho') IS NULL
    ALTER TABLE dbo.benh_nhan ADD quan_he_giam_ho NVARCHAR(60) NULL;
IF COL_LENGTH('dbo.benh_nhan', 'ghi_chu_dinh_danh') IS NULL
    ALTER TABLE dbo.benh_nhan ADD ghi_chu_dinh_danh NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.benh_nhan', 'is_potential_duplicate') IS NULL
BEGIN
    ALTER TABLE dbo.benh_nhan ADD is_potential_duplicate BIT NULL;
    ALTER TABLE dbo.benh_nhan ADD CONSTRAINT DF_benh_nhan_is_potential_duplicate DEFAULT(0) FOR is_potential_duplicate;
END
GO

IF EXISTS(
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA='dbo' AND TABLE_NAME='benh_nhan' AND COLUMN_NAME='dia_chi_xa' AND DATA_TYPE='varchar'
)
BEGIN
    ALTER TABLE dbo.benh_nhan ALTER COLUMN dia_chi_xa NVARCHAR(100) NULL;
END
GO

IF EXISTS(
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA='dbo' AND TABLE_NAME='benh_nhan' AND COLUMN_NAME='dia_chi_huyen' AND DATA_TYPE='varchar'
)
BEGIN
    ALTER TABLE dbo.benh_nhan ALTER COLUMN dia_chi_huyen NVARCHAR(100) NULL;
END
GO

