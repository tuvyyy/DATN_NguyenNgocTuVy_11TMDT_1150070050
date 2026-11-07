-- Read-only verification. Run against the same database configured for the backend.
-- Match these dates with the report filters. Do not compare visit counts with medical-record counts.
SET NOCOUNT ON;
DECLARE @FromDate date = '20220101';
DECLARE @ToDate date = CONVERT(date, DATEADD(hour, 7, SYSUTCDATETIME()));

;WITH Source AS
(
    SELECT lk.id, lk.id_benh_nhan, lk.id_phong, lk.id_bac_si,
           COALESCE(lk.thoi_gian_bat_dau, lk.created_at) AS visit_at,
           UPPER(LTRIM(RTRIM(COALESCE(lk.trang_thai, '')))) AS status,
           UPPER(LTRIM(RTRIM(COALESCE(hs.trang_thai, '')))) AS record_status
    FROM dbo.lan_kham lk
    LEFT JOIN dbo.ho_so_benh_an hs ON hs.id = lk.id_ho_so
    WHERE COALESCE(lk.thoi_gian_bat_dau, lk.created_at) >= @FromDate
      AND COALESCE(lk.thoi_gian_bat_dau, lk.created_at) < DATEADD(day, 1, @ToDate)
), Classified AS
(
    SELECT *,
        CASE WHEN status IN ('HUY', 'DA_HUY', 'CANCELLED', 'CANCELED')
                   OR record_status IN ('HUY', 'DA_HUY', 'CANCELLED', 'CANCELED')
             THEN 1 ELSE 0 END AS cancelled,
        CASE WHEN id > 0 AND id_benh_nhan > 0 AND (id_phong IS NOT NULL OR id_bac_si IS NOT NULL) AND status NOT IN ('', 'NHAP', 'DRAFT')
             THEN 1 ELSE 0 END AS otherwise_valid
    FROM Source
)
SELECT COUNT(*) AS rawCount,
       COALESCE(SUM(CASE WHEN cancelled = 0 AND otherwise_valid = 1 THEN 1 ELSE 0 END), 0) AS validCount,
       COALESCE(SUM(cancelled), 0) AS excludedCancelled,
       COALESCE(SUM(CASE WHEN cancelled = 0 AND otherwise_valid = 0 THEN 1 ELSE 0 END), 0) AS excludedInvalid
FROM Classified;

SELECT COUNT(*) AS undatedCount_all_database
FROM dbo.lan_kham
WHERE thoi_gian_bat_dau IS NULL AND created_at IS NULL;

-- Months with no rows will not appear below; the API fills interior/trailing months with zero.
-- This query returns only complete months fully covered by the filter, excluding the current month.
;WITH Valid AS
(
    SELECT lk.id, COALESCE(lk.thoi_gian_bat_dau, lk.created_at) AS visit_at
    FROM dbo.lan_kham lk
    LEFT JOIN dbo.ho_so_benh_an hs ON hs.id = lk.id_ho_so
    WHERE lk.id > 0 AND lk.id_benh_nhan > 0
      AND (lk.id_phong IS NOT NULL OR lk.id_bac_si IS NOT NULL)
      AND UPPER(LTRIM(RTRIM(COALESCE(lk.trang_thai, '')))) NOT IN ('', 'NHAP', 'DRAFT', 'HUY', 'DA_HUY', 'CANCELLED', 'CANCELED')
      AND UPPER(LTRIM(RTRIM(COALESCE(hs.trang_thai, '')))) NOT IN ('HUY', 'DA_HUY', 'CANCELLED', 'CANCELED')
      AND COALESCE(lk.thoi_gian_bat_dau, lk.created_at) >= @FromDate
      AND COALESCE(lk.thoi_gian_bat_dau, lk.created_at) < DATEADD(day, 1, @ToDate)
), Months AS
(
    SELECT DATEFROMPARTS(YEAR(visit_at), MONTH(visit_at), 1) AS month_start, id
    FROM Valid
)
SELECT CONVERT(char(7), month_start, 126) AS month, COUNT(DISTINCT id) AS count
FROM Months
WHERE month_start >= @FromDate
  AND EOMONTH(month_start) <= @ToDate
  AND EOMONTH(month_start) < CONVERT(date, DATEADD(hour, 7, SYSUTCDATETIME()))
  AND month_start < DATEFROMPARTS(YEAR(DATEADD(hour, 7, SYSUTCDATETIME())), MONTH(DATEADD(hour, 7, SYSUTCDATETIME())), 1)
GROUP BY month_start
ORDER BY month_start;
