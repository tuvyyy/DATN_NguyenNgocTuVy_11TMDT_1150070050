-- Local demonstration history, not real clinic activity.
-- Adds 36 complete months before the current month in Vietnam time.
-- Only inserts DEMO-HIST / HS-DEMO-HIST / HD-DEMO-HIST records; never updates existing rows.
-- Run after schema, base seed and staff/room/service configuration. Safe to rerun.
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;

DECLARE @Today date = CONVERT(date, DATEADD(hour, 7, SYSUTCDATETIME()));
DECLARE @EndMonth date = DATEFROMPARTS(YEAR(@Today), MONTH(@Today), 1);
DECLARE @StartMonth date = DATEADD(month, -36, @EndMonth);
DECLARE @Marker nvarchar(100) = N'[DEMO_VISIT_HISTORY_V1]';
DECLARE @Price decimal(18,2) = 100000; -- Explicitly simulated consultation price.
DECLARE @ReceptionId bigint = (
    SELECT MIN(u.id) FROM dbo.nguoi_dung u
    JOIN dbo.nguoi_dung_vai_tro ur ON ur.id_nguoi_dung=u.id
    JOIN dbo.vai_tro r ON r.id=ur.id_vai_tro
    WHERE u.hoat_dong=1 AND r.ten='TIEP_DON');
DECLARE @CashierId bigint = (
    SELECT MIN(u.id) FROM dbo.nguoi_dung u
    JOIN dbo.nguoi_dung_vai_tro ur ON ur.id_nguoi_dung=u.id
    JOIN dbo.vai_tro r ON r.id=ur.id_vai_tro
    WHERE u.hoat_dong=1 AND r.ten='THU_NGAN');

DECLARE @Pairs TABLE (sequence_no int PRIMARY KEY, doctor_id bigint, room_id int, area_id int, counter_id int, service_id bigint);
INSERT @Pairs
SELECT ROW_NUMBER() OVER (ORDER BY bp.id_bac_si,bp.id_phong), bp.id_bac_si,bp.id_phong,p.id_khu_tiep_don,q.id,s.id
FROM dbo.bac_si_phong bp
JOIN dbo.nguoi_dung u ON u.id=bp.id_bac_si AND u.hoat_dong=1
JOIN dbo.phong_kham p ON p.id=bp.id_phong AND p.hoat_dong=1
JOIN dbo.khu_tiep_don k ON k.id=p.id_khu_tiep_don AND k.hoat_dong=1
CROSS APPLY (SELECT TOP 1 id FROM dbo.quay_tiep_don WHERE id_khu_tiep_don=k.id AND hoat_dong=1 ORDER BY id) q
CROSS APPLY (SELECT TOP 1 id FROM dbo.dich_vu WHERE id_phong=p.id AND hoat_dong=1 ORDER BY id) s
WHERE EXISTS (SELECT 1 FROM dbo.nguoi_dung_vai_tro ur JOIN dbo.vai_tro r ON r.id=ur.id_vai_tro WHERE ur.id_nguoi_dung=u.id AND r.ten='BAC_SI');
DECLARE @PairCount int = (SELECT COUNT(*) FROM @Pairs);
DECLARE @Diseases TABLE (sequence_no int PRIMARY KEY, disease_id bigint);
INSERT @Diseases SELECT ROW_NUMBER() OVER (ORDER BY id),id FROM dbo.benh WHERE ma IS NOT NULL AND LTRIM(RTRIM(ma))<>'';
DECLARE @DiseaseCount int = (SELECT COUNT(*) FROM @Diseases);
IF @ReceptionId IS NULL OR @CashierId IS NULL OR @PairCount=0 OR @DiseaseCount=0
    THROW 51000, 'Configure active reception/cashier users, assigned doctor-room-service pairs, counters and disease catalog before seeding history.', 1;

DECLARE @Cases TABLE (
    record_code varchar(30) PRIMARY KEY, patient_code varchar(30), invoice_code varchar(30), sequence_no int,
    visit_at datetime, doctor_id bigint, room_id int, area_id int, counter_id int, service_id bigint, disease_id bigint);
;WITH Digits AS (SELECT n FROM (VALUES(0),(1),(2),(3),(4),(5),(6),(7),(8),(9)) d(n)),
Numbers AS (SELECT a.n+10*b.n+100*c.n+1 AS n FROM Digits a CROSS JOIN Digits b CROSS JOIN Digits c),
Months AS (SELECT DATEADD(month,n-1,@StartMonth) AS month_start FROM Numbers WHERE n<=36),
Targets AS (
    SELECT month_start, 240+2*DATEDIFF(month,'20200101',month_start)
        + CASE MONTH(month_start) WHEN 1 THEN -45 WHEN 2 THEN -35 WHEN 3 THEN 5 WHEN 4 THEN 10
          WHEN 5 THEN 15 WHEN 6 THEN 25 WHEN 7 THEN 40 WHEN 8 THEN 35 WHEN 9 THEN 15 WHEN 10 THEN 5 WHEN 11 THEN -20 ELSE -50 END
        + (DATEDIFF(month,'20200101',month_start)*7%31)-15 AS visit_count FROM Months)
INSERT @Cases
SELECT CONCAT('HS-DEMO-HIST-',CONVERT(char(6),t.month_start,112),'-',RIGHT(CONCAT('0000',n.n),4)),
    CONCAT('DEMO-HIST-',RIGHT(CONCAT('0000',n.n),4)),
    CONCAT('HD-DEMO-HIST-',CONVERT(char(6),t.month_start,112),'-',RIGHT(CONCAT('0000',n.n),4)), n.n,
    DATEADD(minute, (CASE n.n%10 WHEN 0 THEN 7 WHEN 1 THEN 8 WHEN 2 THEN 8 WHEN 3 THEN 9 WHEN 4 THEN 9
        WHEN 5 THEN 9 WHEN 6 THEN 10 WHEN 7 THEN 10 WHEN 8 THEN 13 ELSE 14 END)*60+(n.n*7%60),
        CONVERT(datetime,DATEADD(day,(n.n-1)%DAY(EOMONTH(t.month_start)),t.month_start))),
    p.doctor_id,p.room_id,p.area_id,p.counter_id,p.service_id,d.disease_id
FROM Targets t JOIN Numbers n ON n.n<=t.visit_count
JOIN @Pairs p ON p.sequence_no=(n.n-1)%@PairCount+1
JOIN @Diseases d ON d.sequence_no=(n.n-1)%@DiseaseCount+1
OPTION (RECOMPILE);

BEGIN TRY
    BEGIN TRANSACTION;
    DECLARE @LockResult int;
    EXEC @LockResult=sys.sp_getapplock @Resource='ClinicDemoVisitHistoryV1',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
    IF @LockResult<0 THROW 51001, 'Another history seed is running. Retry after it finishes.', 1;
    IF EXISTS (SELECT 1 FROM dbo.benh_nhan WHERE ma_bn LIKE 'DEMO-HIST-%' AND LEFT(COALESCE(ghi_chu_dinh_danh,N''),LEN(@Marker))<>@Marker)
       OR EXISTS (SELECT 1 FROM dbo.ho_so_benh_an WHERE ma_hs LIKE 'HS-DEMO-HIST-%' AND LEFT(COALESCE(ghi_chu,N''),LEN(@Marker))<>@Marker)
       OR EXISTS (SELECT 1 FROM dbo.hoa_don WHERE ma_hd LIKE 'HD-DEMO-HIST-%' AND LEFT(COALESCE(ghi_chu,''),LEN(@Marker))<>@Marker)
        THROW 51002, 'Reserved demo identifiers already belong to other records. No data was changed.', 1;

    INSERT dbo.benh_nhan (ma_bn,ho_ten,ngay_sinh,gioi_tinh,quoc_tich,quoc_gia,ghi_chu_dinh_danh,is_potential_duplicate,created_at,updated_at)
    SELECT c.patient_code,CONCAT(N'Bệnh nhân mô phỏng ',RIGHT(CONCAT('0000',MIN(c.sequence_no)),4)),
        DATEFROMPARTS(1970+MIN(c.sequence_no)%35,1+MIN(c.sequence_no)%12,1+MIN(c.sequence_no)%27),
        CASE WHEN MIN(c.sequence_no)%2=0 THEN 'Nu' ELSE 'Nam' END,N'Việt Nam',N'Việt Nam',
        @Marker+N' Dữ liệu tổng hợp để trình diễn báo cáo; không phải người bệnh thật.',0,@StartMonth,@StartMonth
    FROM @Cases c WHERE NOT EXISTS (SELECT 1 FROM dbo.benh_nhan b WHERE b.ma_bn=c.patient_code)
    GROUP BY c.patient_code OPTION (RECOMPILE);
    DECLARE @PatientsAdded int=@@ROWCOUNT;

    INSERT dbo.ho_so_benh_an (id_benh_nhan,ma_hs,ngay_tao,id_nguoi_tao,id_khu_tiep_don,id_quay_tiep_don,ghi_chu,trang_thai,UpdatedAt)
    SELECT b.id,c.record_code,DATEADD(minute,-30,c.visit_at),@ReceptionId,c.area_id,c.counter_id,
        @Marker+N' Lịch sử khám mô phỏng phục vụ thống kê và dự báo.','DA_DONG',DATEADD(minute,20,c.visit_at)
    FROM @Cases c JOIN dbo.benh_nhan b ON b.ma_bn=c.patient_code
    WHERE NOT EXISTS (SELECT 1 FROM dbo.ho_so_benh_an h WHERE h.ma_hs=c.record_code) OPTION (RECOMPILE);
    DECLARE @RecordsAdded int=@@ROWCOUNT;

    INSERT dbo.lan_kham (id_ho_so,id_benh_nhan,id_bac_si,id_tiep_don,id_phong,thoi_gian_bat_dau,thoi_gian_ket_thuc,
        ly_do,chan_doan_cuoi,ket_qua_kham,huong_xu_tri,ghi_chu,trang_thai,created_at,updated_at,id_benh)
    SELECT h.id,h.id_benh_nhan,c.doctor_id,@ReceptionId,c.room_id,c.visit_at,DATEADD(minute,20,c.visit_at),
        'Ca kham mo phong','Chan doan mo phong',N'Kết quả giả lập phục vụ báo cáo; không sử dụng trong chăm sóc người bệnh.',
        'Mo phong',@Marker,'DA_KHAM',DATEADD(minute,-30,c.visit_at),DATEADD(minute,20,c.visit_at),c.disease_id
    FROM @Cases c JOIN dbo.ho_so_benh_an h ON h.ma_hs=c.record_code
    WHERE NOT EXISTS (SELECT 1 FROM dbo.lan_kham l WHERE l.id_ho_so=h.id) OPTION (RECOMPILE);
    DECLARE @VisitsAdded int=@@ROWCOUNT;

    INSERT dbo.lan_kham_dich_vu (id_lan_kham,id_dich_vu,so_luong,don_gia,trang_thai_thuc_hien,ghi_chu)
    SELECT l.id,c.service_id,1,@Price,'DA_THUC_HIEN',@Marker
    FROM @Cases c JOIN dbo.ho_so_benh_an h ON h.ma_hs=c.record_code JOIN dbo.lan_kham l ON l.id_ho_so=h.id
    WHERE NOT EXISTS (SELECT 1 FROM dbo.lan_kham_dich_vu s WHERE s.id_lan_kham=l.id AND s.id_dich_vu=c.service_id) OPTION (RECOMPILE);

    INSERT dbo.hoa_don (ma_hd,id_benh_nhan,id_lan_kham,id_thu_ngan,loai_hoa_don,hinh_thuc_tt,
        tong_tien_truoc,giam_gia,thue_vat,tong_tien,trang_thai,ngay_tao,ngay_thanh_toan,ghi_chu)
    SELECT c.invoice_code,h.id_benh_nhan,l.id,@CashierId,'DANG_KY_DICH_VU','TIEN_MAT',
        @Price,0,0,@Price,'DA_THANH_TOAN',DATEADD(minute,-20,c.visit_at),DATEADD(minute,-10,c.visit_at),'[DEMO_VISIT_HISTORY_V1] Simulated consultation and payment; not real revenue.'
    FROM @Cases c JOIN dbo.ho_so_benh_an h ON h.ma_hs=c.record_code JOIN dbo.lan_kham l ON l.id_ho_so=h.id
    WHERE NOT EXISTS (SELECT 1 FROM dbo.hoa_don i WHERE i.ma_hd=c.invoice_code) OPTION (RECOMPILE);
    DECLARE @InvoicesAdded int=@@ROWCOUNT;

    INSERT dbo.chi_tiet_hoa_don (id_hoa_don,loai_tham_chieu,id_tham_chieu,mo_ta,so_luong,don_gia,thanh_tien,thue_vat)
    SELECT i.id,'SERVICE_ORDER_LINE',c.service_id,@Marker+N' Phí khám giả lập',1,@Price,@Price,0
    FROM @Cases c JOIN dbo.hoa_don i ON i.ma_hd=c.invoice_code
    WHERE NOT EXISTS (SELECT 1 FROM dbo.chi_tiet_hoa_don d WHERE d.id_hoa_don=i.id) OPTION (RECOMPILE);

    DECLARE @InvalidRecords int;
    SELECT @InvalidRecords=COUNT(*) FROM @Cases c JOIN dbo.ho_so_benh_an h ON h.ma_hs=c.record_code
        LEFT JOIN dbo.lan_kham l ON l.id_ho_so=h.id
        WHERE l.id IS NULL OR l.id_benh_nhan<>h.id_benh_nhan OR l.trang_thai<>'DA_KHAM' OR h.trang_thai<>'DA_DONG'
    OPTION (RECOMPILE);
    IF @InvalidRecords>0
        THROW 51003, 'Historical encounter validation failed. The entire seed was rolled back.', 1;
    COMMIT TRANSACTION;
    SELECT @StartMonth AS start_month,DATEADD(day,-1,@EndMonth) AS end_date,36 AS complete_months,
        @PatientsAdded AS patients_added,@RecordsAdded AS records_added,@VisitsAdded AS visits_added,@InvoicesAdded AS invoices_added,
        (SELECT COUNT(*) FROM @Cases) AS expected_history_visits;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
