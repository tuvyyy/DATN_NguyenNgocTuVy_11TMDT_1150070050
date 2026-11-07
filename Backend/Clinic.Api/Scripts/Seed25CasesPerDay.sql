SET NOCOUNT ON;
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;

-- Bo sung du lieu demo de tong so ho so moi ngay dat 25 ca:
-- 10 ca dang xu ly, 3 ca da huy va 12 ca hoan tat.
-- Ho so dang xu ly cua ngay truoc se xuat hien trong tab Ho so ton.
-- Script chi them phan con thieu, chi cap nhat du lieu demo HS-DM va co the chay lai.
DECLARE @StartDate date = '20260525';
DECLARE @EndDate date = CONVERT(date, GETDATE());
DECLARE @TargetCasesPerDay int = 25;
DECLARE @ActorId bigint = (SELECT MIN(id) FROM dbo.nguoi_dung);

IF @EndDate < @StartDate
    THROW 50001, 'Ngay ket thuc phai lon hon hoac bang ngay bat dau.', 1;

DECLARE @Cases TABLE
(
    visit_date date NOT NULL,
    sequence_no int NOT NULL,
    ma_bn varchar(30) NOT NULL PRIMARY KEY,
    ma_hs varchar(30) NOT NULL UNIQUE,
    visit_time datetime NOT NULL,
    target_status varchar(30) NOT NULL
);

;WITH Dates AS
(
    SELECT @StartDate AS visit_date
    UNION ALL
    SELECT DATEADD(day, 1, visit_date)
    FROM Dates
    WHERE visit_date < @EndDate
),
Numbers AS
(
    SELECT 1 AS sequence_no
    UNION ALL
    SELECT sequence_no + 1
    FROM Numbers
    WHERE sequence_no < 100
),
ExistingCounts AS
(
    SELECT
        d.visit_date,
        COUNT(h.id) AS existing_count
    FROM Dates d
    LEFT JOIN dbo.ho_so_benh_an h
        ON h.ngay_tao >= d.visit_date
       AND h.ngay_tao < DATEADD(day, 1, d.visit_date)
    GROUP BY d.visit_date
),
AvailableCandidates AS
(
    SELECT
        d.visit_date,
        n.sequence_no,
        CONCAT('DM', CONVERT(char(6), d.visit_date, 12), RIGHT(CONCAT('000', n.sequence_no), 3)) AS ma_bn,
        CONCAT('HS-DM', CONVERT(char(6), d.visit_date, 12), '-', RIGHT(CONCAT('000', n.sequence_no), 3)) AS ma_hs,
        ROW_NUMBER() OVER (PARTITION BY d.visit_date ORDER BY n.sequence_no) AS available_no,
        ec.existing_count
    FROM Dates d
    CROSS JOIN Numbers n
    INNER JOIN ExistingCounts ec ON ec.visit_date = d.visit_date
    WHERE NOT EXISTS
    (
        SELECT 1
        FROM dbo.benh_nhan bn
        WHERE bn.ma_bn = CONCAT('DM', CONVERT(char(6), d.visit_date, 12), RIGHT(CONCAT('000', n.sequence_no), 3))
    )
    AND NOT EXISTS
    (
        SELECT 1
        FROM dbo.ho_so_benh_an hs
        WHERE hs.ma_hs = CONCAT('HS-DM', CONVERT(char(6), d.visit_date, 12), '-', RIGHT(CONCAT('000', n.sequence_no), 3))
    )
)
INSERT INTO @Cases (visit_date, sequence_no, ma_bn, ma_hs, visit_time, target_status)
SELECT
    visit_date,
    sequence_no,
    ma_bn,
    ma_hs,
    DATEADD(minute, 450 + ((available_no - 1) * 20), CONVERT(datetime, visit_date)),
    CASE
        WHEN available_no = 1 THEN 'MOI_TAO'
        WHEN available_no = 2 THEN 'DA_TIEP_DON'
        WHEN available_no = 3 THEN 'CHO_DICH_VU'
        WHEN available_no = 4 THEN 'DICH_VU_NHAP'
        WHEN available_no = 5 THEN 'CHO_THANH_TOAN'
        WHEN available_no = 6 THEN 'DA_THANH_TOAN'
        WHEN available_no = 7 THEN 'CHO_KHAM'
        WHEN available_no = 8 THEN 'DANG_KHAM'
        WHEN available_no = 9 THEN 'CHO_CAN_LAM_SANG'
        WHEN available_no = 10 THEN 'CHO_KET_QUA'
        WHEN available_no <= 13 THEN 'DA_HUY'
        WHEN available_no <= 24 THEN 'DA_KHAM'
        ELSE 'DA_DONG'
    END
FROM AvailableCandidates
WHERE available_no <= CASE
    WHEN existing_count < @TargetCasesPerDay THEN @TargetCasesPerDay - existing_count
    ELSE 0
END
OPTION (MAXRECURSION 32767);

BEGIN TRY
    BEGIN TRANSACTION;

    INSERT INTO dbo.benh_nhan
    (
        ma_bn,
        ho_ten,
        ngay_sinh,
        gioi_tinh,
        quoc_tich,
        dan_toc,
        dia_chi_duong,
        dia_chi_xa,
        dia_chi_huyen,
        dia_chi_tinh,
        quoc_gia,
        ghi_chu_dinh_danh,
        is_potential_duplicate,
        created_at,
        updated_at
    )
    SELECT
        c.ma_bn,
        CASE (c.sequence_no - 1) % 10
            WHEN 0 THEN N'Nguyễn Minh Anh'
            WHEN 1 THEN N'Trần Gia Bảo'
            WHEN 2 THEN N'Lê Thu Hà'
            WHEN 3 THEN N'Phạm Quang Huy'
            WHEN 4 THEN N'Võ Ngọc Lan'
            WHEN 5 THEN N'Đặng Hoàng Nam'
            WHEN 6 THEN N'Bùi Khánh Linh'
            WHEN 7 THEN N'Đỗ Đức Long'
            WHEN 8 THEN N'Huỳnh Thanh Mai'
            ELSE N'Ngô Nhật Minh'
        END + N' ' + RIGHT(CONCAT(N'00', c.sequence_no), 2),
        DATEFROMPARTS(1980 + ((c.sequence_no * 3) % 25), ((c.sequence_no - 1) % 12) + 1, ((c.sequence_no - 1) % 27) + 1),
        CASE WHEN c.sequence_no % 2 = 0 THEN 'Nu' ELSE 'Nam' END,
        N'Việt Nam',
        N'Kinh',
        CONCAT(N'Số ', c.sequence_no, N' đường Demo'),
        N'Phường Nghĩa Chánh',
        N'Thành phố Quảng Ngãi',
        N'Quảng Ngãi',
        N'Việt Nam',
        N'Dữ liệu demo tạo bởi Seed25CasesPerDay.sql',
        0,
        c.visit_time,
        c.visit_time
    FROM @Cases c;

    INSERT INTO dbo.ho_so_benh_an
    (
        id_benh_nhan,
        ma_hs,
        ngay_tao,
        id_nguoi_tao,
        ghi_chu,
        trang_thai,
        [UpdatedAt]
    )
    SELECT
        bn.id,
        c.ma_hs,
        c.visit_time,
        @ActorId,
        N'[RECEPTION_META]{"receptionArea":{"idKhu":null,"maKhu":null,"tenKhu":null,"idQuay":null,"maQuay":null,"tenQuay":null,"lyDoChuyenKhu":null},"sourceType":"Trực tiếp","visitType":"Khám mới","reasonForVisit":"Khám tổng quát","priority":"Bình thường","receptionNote":"Dữ liệu demo","paymentObject":"Tự phí"}',
        c.target_status,
        DATEADD(minute, 45, c.visit_time)
    FROM @Cases c
    INNER JOIN dbo.benh_nhan bn ON bn.ma_bn = c.ma_bn;

    INSERT INTO dbo.lan_kham
    (
        id_ho_so,
        id_benh_nhan,
        id_tiep_don,
        thoi_gian_bat_dau,
        thoi_gian_ket_thuc,
        ly_do,
        ket_qua_kham,
        ghi_chu,
        trang_thai,
        created_at,
        updated_at
    )
    SELECT
        hs.id,
        bn.id,
        @ActorId,
        DATEADD(minute, 10, c.visit_time),
        CASE WHEN c.target_status IN ('DA_KHAM', 'DA_DONG') THEN DATEADD(minute, 40, c.visit_time) END,
        'Kham tong quat',
        CASE WHEN c.target_status IN ('DA_KHAM', 'DA_DONG') THEN N'Đã khám và tư vấn' END,
        N'Dữ liệu demo',
        CASE
            WHEN c.target_status IN ('DA_HUY') THEN 'DA_HUY'
            WHEN c.target_status IN ('DA_KHAM', 'DA_DONG') THEN 'DA_KHAM'
            WHEN c.target_status = 'CHO_KHAM' THEN 'CHO_KHAM'
            ELSE 'TIEP_DON'
        END,
        c.visit_time,
        DATEADD(minute, 40, c.visit_time)
    FROM @Cases c
    INNER JOIN dbo.benh_nhan bn ON bn.ma_bn = c.ma_bn
    INNER JOIN dbo.ho_so_benh_an hs ON hs.ma_hs = c.ma_hs
    WHERE NOT EXISTS
    (
        SELECT 1
        FROM dbo.lan_kham lk
        WHERE lk.id_ho_so = hs.id
    );

    -- Phan bo lai cac dong demo neu phien ban cu cua script da tao tat ca la DA_KHAM.
    UPDATE hs
    SET
        hs.trang_thai = CASE
            WHEN TRY_CONVERT(int, RIGHT(hs.ma_hs, 3)) = 1 THEN 'MOI_TAO'
            WHEN TRY_CONVERT(int, RIGHT(hs.ma_hs, 3)) = 2 THEN 'DA_TIEP_DON'
            WHEN TRY_CONVERT(int, RIGHT(hs.ma_hs, 3)) = 3 THEN 'CHO_DICH_VU'
            WHEN TRY_CONVERT(int, RIGHT(hs.ma_hs, 3)) = 4 THEN 'DICH_VU_NHAP'
            WHEN TRY_CONVERT(int, RIGHT(hs.ma_hs, 3)) = 5 THEN 'CHO_THANH_TOAN'
            WHEN TRY_CONVERT(int, RIGHT(hs.ma_hs, 3)) = 6 THEN 'DA_THANH_TOAN'
            WHEN TRY_CONVERT(int, RIGHT(hs.ma_hs, 3)) = 7 THEN 'CHO_KHAM'
            WHEN TRY_CONVERT(int, RIGHT(hs.ma_hs, 3)) = 8 THEN 'DANG_KHAM'
            WHEN TRY_CONVERT(int, RIGHT(hs.ma_hs, 3)) = 9 THEN 'CHO_CAN_LAM_SANG'
            WHEN TRY_CONVERT(int, RIGHT(hs.ma_hs, 3)) = 10 THEN 'CHO_KET_QUA'
            WHEN TRY_CONVERT(int, RIGHT(hs.ma_hs, 3)) BETWEEN 11 AND 13 THEN 'DA_HUY'
            WHEN TRY_CONVERT(int, RIGHT(hs.ma_hs, 3)) BETWEEN 14 AND 24 THEN 'DA_KHAM'
            ELSE 'DA_DONG'
        END,
        hs.ghi_chu = N'[RECEPTION_META]{"receptionArea":{"idKhu":null,"maKhu":null,"tenKhu":null,"idQuay":null,"maQuay":null,"tenQuay":null,"lyDoChuyenKhu":null},"sourceType":"Trực tiếp","visitType":"Khám mới","reasonForVisit":"Khám tổng quát","priority":"Bình thường","receptionNote":"Dữ liệu demo","paymentObject":"Tự phí"}'
    FROM dbo.ho_so_benh_an hs
    WHERE hs.ma_hs LIKE 'HS-DM%'
      AND hs.ngay_tao >= @StartDate
      AND hs.ngay_tao < DATEADD(day, 1, @EndDate);

    UPDATE lk
    SET
        lk.trang_thai = CASE
            WHEN hs.trang_thai = 'DA_HUY' THEN 'DA_HUY'
            WHEN hs.trang_thai IN ('DA_KHAM', 'DA_DONG') THEN 'DA_KHAM'
            WHEN hs.trang_thai = 'CHO_KHAM' THEN 'CHO_KHAM'
            WHEN hs.trang_thai = 'DANG_KHAM' THEN 'DANG_KHAM'
            WHEN hs.trang_thai IN ('CHO_CAN_LAM_SANG', 'CHO_KET_QUA', 'CHO_KET_LUAN') THEN 'DANG_KHAM'
            ELSE 'TIEP_DON'
        END,
        lk.thoi_gian_ket_thuc = CASE
            WHEN hs.trang_thai IN ('DA_KHAM', 'DA_DONG') THEN DATEADD(minute, 40, lk.created_at)
            ELSE NULL
        END,
        lk.ket_qua_kham = CASE
            WHEN hs.trang_thai IN ('DA_KHAM', 'DA_DONG') THEN N'Đã khám và tư vấn'
            ELSE NULL
        END
    FROM dbo.lan_kham lk
    INNER JOIN dbo.ho_so_benh_an hs ON hs.id = lk.id_ho_so
    WHERE hs.ma_hs LIKE 'HS-DM%'
      AND hs.ngay_tao >= @StartDate
      AND hs.ngay_tao < DATEADD(day, 1, @EndDate);

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

;WITH ReportDates AS
(
    SELECT @StartDate AS visit_date
    UNION ALL
    SELECT DATEADD(day, 1, visit_date)
    FROM ReportDates
    WHERE visit_date < @EndDate
)
SELECT
    CONVERT(char(10), d.visit_date, 103) AS ngay,
    COUNT(h.id) AS so_ca,
    SUM(CASE WHEN h.ma_hs LIKE 'HS-DM%' THEN 1 ELSE 0 END) AS so_ca_demo,
    SUM(CASE WHEN h.ma_hs LIKE 'HS-DM%' AND h.trang_thai NOT IN ('DA_HUY', 'DA_KHAM', 'DA_DONG') THEN 1 ELSE 0 END) AS dang_tiep_don,
    SUM(CASE WHEN h.ma_hs LIKE 'HS-DM%' AND h.trang_thai = 'DA_HUY' THEN 1 ELSE 0 END) AS da_huy,
    SUM(CASE WHEN h.ma_hs LIKE 'HS-DM%' AND h.trang_thai IN ('DA_KHAM', 'DA_DONG') THEN 1 ELSE 0 END) AS hoan_tat
FROM ReportDates d
LEFT JOIN dbo.ho_so_benh_an h
    ON h.ngay_tao >= d.visit_date
   AND h.ngay_tao < DATEADD(day, 1, d.visit_date)
GROUP BY d.visit_date
ORDER BY d.visit_date
OPTION (MAXRECURSION 32767);
