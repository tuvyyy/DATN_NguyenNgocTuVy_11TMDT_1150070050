-- Minimal configuration for a new database; no copied patients, accounts or clinical history.
SET NOCOUNT ON;
SET XACT_ABORT ON;
IF EXISTS (SELECT 1 FROM dbo.nguoi_dung)
    THROW 51000, 'Base seed is for a fresh database before creating accounts. Existing users were found.', 1;
BEGIN TRANSACTION;

INSERT dbo.vai_tro (ten, mo_ta)
SELECT v.ten, v.mo_ta FROM (VALUES
    ('ADMIN', N'Quan tri he thong'),
    ('TIEP_DON', N'Nhan vien tiep don'),
    ('BAC_SI', N'Bac si kham benh'),
    ('KY_THUAT_VIEN', N'Nhan vien can lam sang'),
    ('THU_NGAN', N'Nhan vien thu ngan')
) v(ten, mo_ta)
WHERE NOT EXISTS (SELECT 1 FROM dbo.vai_tro r WHERE r.ten = v.ten);

INSERT dbo.chuc_nang (ma_chuc_nang, ten, mo_ta)
SELECT v.ma, v.ten, v.ten FROM (VALUES
    ('TIEP_DON', 'Tiep don'), ('KHAM_BENH', 'Kham benh'), ('DVKT', 'Can lam sang'),
    ('THANH_TOAN', 'Thanh toan'), ('BAO_CAO', 'Bao cao'), ('DANH_MUC', 'Danh muc'),
    ('NGUOI_DUNG', 'Nguoi dung'), ('PHAN_QUYEN', 'Phan quyen')
) v(ma, ten)
WHERE NOT EXISTS (SELECT 1 FROM dbo.chuc_nang c WHERE c.ma_chuc_nang = v.ma);

INSERT dbo.quyen (id_chuc_nang, ma_quyen, xem, them, sua, xoa, xuat)
SELECT c.id, c.ma_chuc_nang + '_FULL', 1, 1, 1, 1, 1
FROM dbo.chuc_nang c
WHERE NOT EXISTS (SELECT 1 FROM dbo.quyen q WHERE q.ma_quyen = c.ma_chuc_nang + '_FULL');

INSERT dbo.vai_tro_quyen (id_vai_tro, id_quyen, xem, them, sua, xoa, xuat)
SELECT r.id, q.id, 1, 1, 1, 1, 1
FROM dbo.vai_tro r
CROSS JOIN dbo.quyen q
JOIN dbo.chuc_nang c ON c.id = q.id_chuc_nang
WHERE q.ma_quyen = c.ma_chuc_nang + '_FULL'
  AND (r.ten = 'ADMIN'
    OR (r.ten = 'TIEP_DON' AND c.ma_chuc_nang IN ('TIEP_DON', 'BAO_CAO'))
    OR (r.ten = 'BAC_SI' AND c.ma_chuc_nang IN ('KHAM_BENH', 'BAO_CAO'))
    OR (r.ten = 'KY_THUAT_VIEN' AND c.ma_chuc_nang IN ('DVKT', 'BAO_CAO'))
    OR (r.ten = 'THU_NGAN' AND c.ma_chuc_nang IN ('THANH_TOAN', 'BAO_CAO')))
  AND NOT EXISTS (SELECT 1 FROM dbo.vai_tro_quyen m WHERE m.id_vai_tro = r.id AND m.id_quyen = q.id);

INSERT dbo.khu_tiep_don (ma_khu, ten_khu, hoat_dong)
SELECT v.ma, v.ten, 1 FROM (VALUES ('KHU_A', N'Khu A'), ('KHU_B', N'Khu B')) v(ma, ten)
WHERE NOT EXISTS (SELECT 1 FROM dbo.khu_tiep_don k WHERE k.ma_khu = v.ma);

INSERT dbo.quay_tiep_don (id_khu_tiep_don, ma_quay, ten_quay, thu_tu, hoat_dong)
SELECT k.id, v.ma, v.ten, 1, 1
FROM (VALUES ('KHU_A', 'A.01', N'Quầy A.01'), ('KHU_B', 'B.01', N'Quầy B.01')) v(khu, ma, ten)
JOIN dbo.khu_tiep_don k ON k.ma_khu = v.khu
WHERE NOT EXISTS (SELECT 1 FROM dbo.quay_tiep_don q WHERE q.id_khu_tiep_don = k.id AND q.ma_quay = v.ma);

COMMIT TRANSACTION;
PRINT 'Base roles, permissions and reception areas are ready. Create your own admin account next.';
GO
