/*
  Convert nguoi_dung.ho_ten from VARCHAR(150) to NVARCHAR(150)
  to store Vietnamese diacritics correctly.
*/
SET NOCOUNT ON;

IF EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'dbo'
      AND TABLE_NAME = 'nguoi_dung'
      AND COLUMN_NAME = 'ho_ten'
      AND DATA_TYPE = 'varchar'
)
BEGIN
    DECLARE @isNullable NVARCHAR(3);
    SELECT @isNullable = IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'dbo'
      AND TABLE_NAME = 'nguoi_dung'
      AND COLUMN_NAME = 'ho_ten';

    IF @isNullable = 'YES'
        ALTER TABLE dbo.nguoi_dung
            ALTER COLUMN ho_ten NVARCHAR(150) NULL;
    ELSE
        ALTER TABLE dbo.nguoi_dung
            ALTER COLUMN ho_ten NVARCHAR(150) NOT NULL;
END
