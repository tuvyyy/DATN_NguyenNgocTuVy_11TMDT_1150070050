SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF COL_LENGTH('dbo.lan_kham', 'benh_kem_theo') IS NULL
        ALTER TABLE dbo.lan_kham ADD benh_kem_theo NVARCHAR(500) NULL;

    IF OBJECT_ID(N'dbo.giay_hen_kham_lai', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.giay_hen_kham_lai
        (
            id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_giay_hen_kham_lai PRIMARY KEY,
            id_lan_kham BIGINT NOT NULL,
            id_benh_nhan BIGINT NULL,
            id_bac_si BIGINT NULL,
            hinh_thuc_dieu_tri NVARCHAR(120) NULL,
            ket_qua NVARCHAR(120) NULL,
            ly_do_hen NVARCHAR(1000) NULL,
            benh_kem_theo NVARCHAR(500) NULL,
            loi_dan NVARCHAR(1000) NULL,
            ngay_hen DATETIME NOT NULL,
            phong_hen NVARCHAR(150) NULL,
            ghi_chu NVARCHAR(1000) NULL,
            da_ky BIT NOT NULL CONSTRAINT DF_giay_hen_kham_lai_da_ky DEFAULT (0),
            bac_si_ky NVARCHAR(150) NULL,
            signed_at DATETIME NULL,
            created_at DATETIME NOT NULL CONSTRAINT DF_giay_hen_kham_lai_created DEFAULT (GETDATE()),
            updated_at DATETIME NULL
        );
    END;

    IF COL_LENGTH('dbo.giay_hen_kham_lai', 'signed_at') IS NULL
        ALTER TABLE dbo.giay_hen_kham_lai ADD signed_at DATETIME NULL;

    IF OBJECT_ID(N'dbo.lan_kham_benh_kem_theo', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.lan_kham_benh_kem_theo
        (
            id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_lan_kham_benh_kem_theo PRIMARY KEY,
            id_lan_kham BIGINT NOT NULL,
            id_benh BIGINT NOT NULL,
            thu_tu INT NOT NULL CONSTRAINT DF_lan_kham_benh_kem_theo_thu_tu DEFAULT (1),
            created_at DATETIME NOT NULL CONSTRAINT DF_lan_kham_benh_kem_theo_created DEFAULT (GETDATE())
        );
    END;

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_lan_kham_benh_kem_theo' AND object_id = OBJECT_ID(N'dbo.lan_kham_benh_kem_theo'))
        CREATE UNIQUE INDEX UX_lan_kham_benh_kem_theo ON dbo.lan_kham_benh_kem_theo(id_lan_kham, id_benh);

    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_lan_kham_benh_kem_theo_lan_kham')
        ALTER TABLE dbo.lan_kham_benh_kem_theo
            ADD CONSTRAINT FK_lan_kham_benh_kem_theo_lan_kham
            FOREIGN KEY (id_lan_kham) REFERENCES dbo.lan_kham(id) ON DELETE CASCADE;

    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_lan_kham_benh_kem_theo_benh')
        ALTER TABLE dbo.lan_kham_benh_kem_theo
            ADD CONSTRAINT FK_lan_kham_benh_kem_theo_benh
            FOREIGN KEY (id_benh) REFERENCES dbo.benh(id);

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_giay_hen_kham_lai_lankham_time' AND object_id = OBJECT_ID(N'dbo.giay_hen_kham_lai'))
        CREATE INDEX IX_giay_hen_kham_lai_lankham_time ON dbo.giay_hen_kham_lai(id_lan_kham, created_at);

    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_giay_hen_kham_lai_lan_kham')
        ALTER TABLE dbo.giay_hen_kham_lai
            ADD CONSTRAINT FK_giay_hen_kham_lai_lan_kham
            FOREIGN KEY (id_lan_kham) REFERENCES dbo.lan_kham(id) ON DELETE CASCADE;

    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_giay_hen_kham_lai_benh_nhan')
        ALTER TABLE dbo.giay_hen_kham_lai
            ADD CONSTRAINT FK_giay_hen_kham_lai_benh_nhan
            FOREIGN KEY (id_benh_nhan) REFERENCES dbo.benh_nhan(id);

    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_giay_hen_kham_lai_bac_si')
        ALTER TABLE dbo.giay_hen_kham_lai
            ADD CONSTRAINT FK_giay_hen_kham_lai_bac_si
            FOREIGN KEY (id_bac_si) REFERENCES dbo.nguoi_dung(id);

    IF OBJECT_ID(N'dbo.giay_ket_luan_kham', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.giay_ket_luan_kham
        (
            id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_giay_ket_luan_kham PRIMARY KEY,
            id_lan_kham BIGINT NOT NULL,
            id_benh_nhan BIGINT NULL,
            id_bac_si BIGINT NULL,
            loai_giay VARCHAR(40) NOT NULL,
            hinh_thuc_dieu_tri NVARCHAR(120) NULL,
            ket_qua NVARCHAR(120) NULL,
            chan_doan NVARCHAR(1000) NULL,
            benh_kem_theo NVARCHAR(1000) NULL,
            ly_do_hen NVARCHAR(1000) NULL,
            loi_dan NVARCHAR(1000) NULL,
            ngay_hen DATETIME NULL,
            phong_hen NVARCHAR(150) NULL,
            ly_do_vao_vien NVARCHAR(1000) NULL,
            khoa_nhap_vien NVARCHAR(200) NULL,
            kinh_gui NVARCHAR(300) NULL,
            dau_hieu_lam_sang NVARCHAR(1500) NULL,
            ly_do_chuyen_tuyen NVARCHAR(500) NULL,
            huong_dieu_tri_chuyen_tuyen NVARCHAR(1000) NULL,
            phuong_tien_van_chuyen NVARCHAR(300) NULL,
            ly_do_khong_kham NVARCHAR(1000) NULL,
            ghi_chu NVARCHAR(1000) NULL,
            da_ky BIT NOT NULL CONSTRAINT DF_giay_ket_luan_kham_da_ky DEFAULT (0),
            bac_si_ky NVARCHAR(150) NULL,
            signed_at DATETIME NULL,
            created_at DATETIME NOT NULL CONSTRAINT DF_giay_ket_luan_kham_created DEFAULT (GETDATE()),
            updated_at DATETIME NULL
        );
    END;

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_giay_ket_luan_kham_lankham_type_time' AND object_id = OBJECT_ID(N'dbo.giay_ket_luan_kham'))
        CREATE INDEX IX_giay_ket_luan_kham_lankham_type_time
            ON dbo.giay_ket_luan_kham(id_lan_kham, loai_giay, created_at);

    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_giay_ket_luan_kham_lan_kham')
        ALTER TABLE dbo.giay_ket_luan_kham
            ADD CONSTRAINT FK_giay_ket_luan_kham_lan_kham
            FOREIGN KEY (id_lan_kham) REFERENCES dbo.lan_kham(id) ON DELETE CASCADE;

    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_giay_ket_luan_kham_benh_nhan')
        ALTER TABLE dbo.giay_ket_luan_kham
            ADD CONSTRAINT FK_giay_ket_luan_kham_benh_nhan
            FOREIGN KEY (id_benh_nhan) REFERENCES dbo.benh_nhan(id);

    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_giay_ket_luan_kham_bac_si')
        ALTER TABLE dbo.giay_ket_luan_kham
            ADD CONSTRAINT FK_giay_ket_luan_kham_bac_si
            FOREIGN KEY (id_bac_si) REFERENCES dbo.nguoi_dung(id);

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

    IF COL_LENGTH('dbo.thuoc', 'hoat_chat') IS NULL
        ALTER TABLE dbo.thuoc ADD hoat_chat NVARCHAR(200) NULL;

    IF COL_LENGTH('dbo.thuoc', 'loai_thuoc') IS NULL
        ALTER TABLE dbo.thuoc ADD loai_thuoc NVARCHAR(60) NULL;

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_thuoc_hoat_chat' AND object_id = OBJECT_ID(N'dbo.thuoc'))
        CREATE INDEX IX_thuoc_hoat_chat ON dbo.thuoc(hoat_chat);

    IF OBJECT_ID(N'dbo.kham_benh_audit_logs', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.kham_benh_audit_logs
        (
            id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_kham_benh_audit_logs PRIMARY KEY,
            id_lan_kham BIGINT NULL,
            id_ho_so BIGINT NULL,
            id_benh_nhan BIGINT NULL,
            id_phong INT NULL,
            id_bac_si_chu_so_huu BIGINT NULL,
            id_nguoi_thuc_hien BIGINT NULL,
            ten_nguoi_thuc_hien NVARCHAR(150) NULL,
            hanh_dong VARCHAR(80) NOT NULL,
            doi_tuong VARCHAR(50) NULL,
            id_doi_tuong BIGINT NULL,
            ly_do NVARCHAR(500) NULL,
            du_lieu_truoc NVARCHAR(MAX) NULL,
            du_lieu_sau NVARCHAR(MAX) NULL,
            ip_address VARCHAR(60) NULL,
            user_agent NVARCHAR(300) NULL,
            created_at DATETIME NOT NULL CONSTRAINT DF_kham_benh_audit_logs_created DEFAULT (GETDATE())
        );
    END;

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_kham_benh_audit_logs_lankham_time' AND object_id = OBJECT_ID(N'dbo.kham_benh_audit_logs'))
        CREATE INDEX IX_kham_benh_audit_logs_lankham_time
            ON dbo.kham_benh_audit_logs(id_lan_kham, created_at);

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_kham_benh_audit_logs_hoso_time' AND object_id = OBJECT_ID(N'dbo.kham_benh_audit_logs'))
        CREATE INDEX IX_kham_benh_audit_logs_hoso_time
            ON dbo.kham_benh_audit_logs(id_ho_so, created_at);

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_kham_benh_audit_logs_actor_time' AND object_id = OBJECT_ID(N'dbo.kham_benh_audit_logs'))
        CREATE INDEX IX_kham_benh_audit_logs_actor_time
            ON dbo.kham_benh_audit_logs(id_nguoi_thuc_hien, created_at);

    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_kham_benh_audit_logs_lan_kham')
        ALTER TABLE dbo.kham_benh_audit_logs
            ADD CONSTRAINT FK_kham_benh_audit_logs_lan_kham
            FOREIGN KEY (id_lan_kham) REFERENCES dbo.lan_kham(id) ON DELETE CASCADE;

    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_kham_benh_audit_logs_ho_so')
        ALTER TABLE dbo.kham_benh_audit_logs
            ADD CONSTRAINT FK_kham_benh_audit_logs_ho_so
            FOREIGN KEY (id_ho_so) REFERENCES dbo.ho_so_benh_an(id);

    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_kham_benh_audit_logs_benh_nhan')
        ALTER TABLE dbo.kham_benh_audit_logs
            ADD CONSTRAINT FK_kham_benh_audit_logs_benh_nhan
            FOREIGN KEY (id_benh_nhan) REFERENCES dbo.benh_nhan(id);

    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_kham_benh_audit_logs_phong')
        ALTER TABLE dbo.kham_benh_audit_logs
            ADD CONSTRAINT FK_kham_benh_audit_logs_phong
            FOREIGN KEY (id_phong) REFERENCES dbo.phong_kham(id);

    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_kham_benh_audit_logs_bac_si_chu_so_huu')
        ALTER TABLE dbo.kham_benh_audit_logs
            ADD CONSTRAINT FK_kham_benh_audit_logs_bac_si_chu_so_huu
            FOREIGN KEY (id_bac_si_chu_so_huu) REFERENCES dbo.nguoi_dung(id);

    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_kham_benh_audit_logs_nguoi_thuc_hien')
        ALTER TABLE dbo.kham_benh_audit_logs
            ADD CONSTRAINT FK_kham_benh_audit_logs_nguoi_thuc_hien
            FOREIGN KEY (id_nguoi_thuc_hien) REFERENCES dbo.nguoi_dung(id);

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;
