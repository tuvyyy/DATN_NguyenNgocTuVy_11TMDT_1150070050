SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF COL_LENGTH('dbo.chi_dinh_dvkt', 'bac_si_da_doc_ket_qua') IS NULL
        ALTER TABLE dbo.chi_dinh_dvkt
            ADD bac_si_da_doc_ket_qua BIT NOT NULL
                CONSTRAINT DF_chi_dinh_dvkt_bac_si_da_doc_ket_qua DEFAULT (0);

    IF COL_LENGTH('dbo.chi_dinh_dvkt', 'bac_si_doc_ket_qua_luc') IS NULL
        ALTER TABLE dbo.chi_dinh_dvkt ADD bac_si_doc_ket_qua_luc DATETIME NULL;

    IF COL_LENGTH('dbo.chi_dinh_dvkt', 'id_bac_si_doc_ket_qua') IS NULL
        ALTER TABLE dbo.chi_dinh_dvkt ADD id_bac_si_doc_ket_qua BIGINT NULL;

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_chi_dinh_dvkt_lankham_created' AND object_id = OBJECT_ID(N'dbo.chi_dinh_dvkt'))
        CREATE INDEX IX_chi_dinh_dvkt_lankham_created
            ON dbo.chi_dinh_dvkt(id_lan_kham, created_at);

    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_chi_dinh_dvkt_bac_si_doc_ket_qua')
        ALTER TABLE dbo.chi_dinh_dvkt
            ADD CONSTRAINT FK_chi_dinh_dvkt_bac_si_doc_ket_qua
            FOREIGN KEY (id_bac_si_doc_ket_qua) REFERENCES dbo.nguoi_dung(id);

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;
