-- Optional first step for a NEW local setup. Change DACN here if using another database name.
-- Does not delete or replace an existing database.
USE [master];
GO
IF DB_ID(N'DACN') IS NULL
BEGIN
    CREATE DATABASE [DACN];
END;
GO
