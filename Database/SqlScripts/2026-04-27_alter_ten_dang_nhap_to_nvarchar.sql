USE [DACN];
GO

IF EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'nguoi_dung'
      AND COLUMN_NAME = 'ten_dang_nhap'
      AND DATA_TYPE <> 'nvarchar'
)
BEGIN
    DECLARE @constraintName sysname;

    SELECT @constraintName = kc.name
    FROM sys.key_constraints kc
    JOIN sys.index_columns ic
        ON ic.object_id = kc.parent_object_id
       AND ic.index_id = kc.unique_index_id
    JOIN sys.columns c
        ON c.object_id = ic.object_id
       AND c.column_id = ic.column_id
    WHERE kc.parent_object_id = OBJECT_ID('dbo.nguoi_dung')
      AND c.name = 'ten_dang_nhap';

    IF @constraintName IS NOT NULL
    BEGIN
        EXEC(N'ALTER TABLE dbo.nguoi_dung DROP CONSTRAINT [' + @constraintName + N']');
    END

    ALTER TABLE dbo.nguoi_dung
        ALTER COLUMN ten_dang_nhap NVARCHAR(100) NOT NULL;

    IF @constraintName IS NULL
    BEGIN
        SET @constraintName = N'UQ_nguoi_dung_ten_dang_nhap';
    END

    EXEC(N'ALTER TABLE dbo.nguoi_dung ADD CONSTRAINT [' + @constraintName + N'] UNIQUE NONCLUSTERED (ten_dang_nhap)');
END
GO
