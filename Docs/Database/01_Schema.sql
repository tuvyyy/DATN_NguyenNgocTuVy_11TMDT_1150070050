-- Full table schema exported from DACN. Contains no patient data, accounts, passwords or server paths.
-- Run ONLY against a newly created EMPTY database. Never use this as an incremental update.
-- SSMS: select the target database before executing. SQLCMD: use -d <database> -b -f 65001.
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SinhHieu](
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
	[IdLanKham] [bigint] NOT NULL,
	[NhietDo] [float] NULL,
	[HuyetApTamThu] [int] NULL,
	[HuyetApTamTruong] [int] NULL,
	[NhipTim] [int] NULL,
	[NhipTho] [int] NULL,
	[SpO2] [int] NULL,
	[CanNang] [float] NULL,
	[ChieuCao] [float] NULL,
	[ThoiGianDo] [datetime] NOT NULL,
	[BMI]  AS (case when [ChieuCao]>(0) then round([CanNang]/power([ChieuCao]/(100.0),(2)),(1))  end),
PRIMARY KEY CLUSTERED
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[chi_tiet_hoa_don](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[id_hoa_don] [bigint] NULL,
	[loai_tham_chieu] [varchar](20) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[id_tham_chieu] [bigint] NULL,
	[mo_ta] [nvarchar](255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[so_luong] [int] NULL,
	[don_gia] [decimal](18, 2) NULL,
	[thanh_tien] [decimal](18, 2) NULL,
	[thue_vat] [decimal](5, 2) NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[dvkt_thuc_hien_log](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[id_chi_dinh_dvkt] [bigint] NOT NULL,
	[id_nguoi_thuc_hien] [bigint] NOT NULL,
	[Action] [nvarchar](100) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[note] [nvarchar](max) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[CreatedAt] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[dvkt_ket_qua](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[id_chi_dinh_dvkt] [bigint] NOT NULL,
	[ket_qua_text] [nvarchar](max) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[file_url] [nvarchar](max) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[nguoi_thuc_hien] [nvarchar](255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[thoi_gian_thuc_hien] [datetime] NULL,
	[trang_thai] [varchar](20) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[bo_chi_dinh](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[ma_bo] [varchar](30) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[ten] [varchar](150) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[mo_ta] [varchar](255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF),
UNIQUE NONCLUSTERED
(
	[ma_bo] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[benh_nhan](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[ma_bn] [varchar](30) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[ho_ten] [nvarchar](100) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[ngay_sinh] [date] NULL,
	[gioi_tinh] [varchar](10) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[cccd] [varchar](20) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[quoc_tich] [nvarchar](100) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[dan_toc] [nvarchar](100) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[so_dien_thoai] [varchar](20) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[email] [varchar](120) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[nghe_nghiep] [nvarchar](100) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[dia_chi_duong] [nvarchar](255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[dia_chi_xa] [nvarchar](100) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[dia_chi_huyen] [nvarchar](100) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[dia_chi_tinh] [nvarchar](255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[quoc_gia] [nvarchar](50) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[created_at] [datetime] NULL,
	[updated_at] [datetime] NULL,
	[nguoi_lien_he_khan_cap] [nvarchar](120) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[sdt_lien_he_khan_cap] [varchar](20) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[quan_he_lien_he_khan_cap] [nvarchar](60) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[nguoi_giam_ho] [nvarchar](120) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[sdt_giam_ho] [varchar](20) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[quan_he_giam_ho] [nvarchar](60) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[ghi_chu_dinh_danh] [nvarchar](500) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[is_potential_duplicate] [bit] NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF),
UNIQUE NONCLUSTERED
(
	[ma_bn] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[lan_kham_benh_kem_theo](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[id_lan_kham] [bigint] NOT NULL,
	[id_benh] [bigint] NOT NULL,
	[thu_tu] [int] NOT NULL,
	[created_at] [datetime] NOT NULL,
 CONSTRAINT [PK_lan_kham_benh_kem_theo] PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[benh](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[ma] [nvarchar](20) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[ten] [nvarchar](255) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[mo_ta] [nvarchar](255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[chuc_nang](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[ma_chuc_nang] [varchar](50) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[ten] [varchar](100) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[mo_ta] [varchar](255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF),
UNIQUE NONCLUSTERED
(
	[ma_chuc_nang] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[khu_tiep_don](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[ma_khu] [varchar](30) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[ten_khu] [nvarchar](150) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[mo_ta] [nvarchar](500) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[hoat_dong] [bit] NOT NULL,
	[created_at] [datetime] NOT NULL,
	[updated_at] [datetime] NULL,
 CONSTRAINT [PK_khu_tiep_don] PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[hoa_don](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[ma_hd] [varchar](30) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[id_benh_nhan] [bigint] NULL,
	[id_lan_kham] [bigint] NULL,
	[id_thu_ngan] [bigint] NULL,
	[loai_hoa_don] [varchar](20) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[hinh_thuc_tt] [varchar](50) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[ma_giao_dich_vnpay] [varchar](100) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[tong_tien_truoc] [decimal](18, 2) NULL,
	[giam_gia] [decimal](18, 2) NULL,
	[thue_vat] [decimal](5, 2) NULL,
	[tong_tien] [decimal](18, 2) NULL,
	[trang_thai] [varchar](20) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[ngay_tao] [datetime] NULL,
	[ngay_thanh_toan] [datetime] NULL,
	[ghi_chu] [varchar](255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF),
UNIQUE NONCLUSTERED
(
	[ma_hd] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[giay_ket_luan_kham](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[id_lan_kham] [bigint] NOT NULL,
	[id_benh_nhan] [bigint] NULL,
	[id_bac_si] [bigint] NULL,
	[loai_giay] [varchar](40) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[hinh_thuc_dieu_tri] [nvarchar](120) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[ket_qua] [nvarchar](120) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[chan_doan] [nvarchar](1000) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[benh_kem_theo] [nvarchar](1000) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[ly_do_hen] [nvarchar](1000) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[loi_dan] [nvarchar](1000) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[ngay_hen] [datetime] NULL,
	[phong_hen] [nvarchar](150) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[ly_do_vao_vien] [nvarchar](1000) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[khoa_nhap_vien] [nvarchar](200) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[kinh_gui] [nvarchar](300) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[dau_hieu_lam_sang] [nvarchar](1500) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[ly_do_chuyen_tuyen] [nvarchar](500) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[huong_dieu_tri_chuyen_tuyen] [nvarchar](1000) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[phuong_tien_van_chuyen] [nvarchar](300) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[ly_do_khong_kham] [nvarchar](1000) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[ghi_chu] [nvarchar](1000) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[da_ky] [bit] NOT NULL,
	[bac_si_ky] [nvarchar](150) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[signed_at] [datetime] NULL,
	[created_at] [datetime] NOT NULL,
	[updated_at] [datetime] NULL,
 CONSTRAINT [PK_giay_ket_luan_kham] PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[giay_hen_kham_lai](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[id_lan_kham] [bigint] NOT NULL,
	[id_benh_nhan] [bigint] NULL,
	[id_bac_si] [bigint] NULL,
	[hinh_thuc_dieu_tri] [nvarchar](120) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[ket_qua] [nvarchar](120) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[ly_do_hen] [nvarchar](1000) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[benh_kem_theo] [nvarchar](500) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[loi_dan] [nvarchar](1000) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[ngay_hen] [datetime] NOT NULL,
	[phong_hen] [nvarchar](150) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[ghi_chu] [nvarchar](1000) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[da_ky] [bit] NOT NULL,
	[bac_si_ky] [nvarchar](150) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[created_at] [datetime] NOT NULL,
	[updated_at] [datetime] NULL,
	[signed_at] [datetime] NULL,
 CONSTRAINT [PK_giay_hen_kham_lai] PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[don_thuoc](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[id_lan_kham] [bigint] NULL,
	[id_benh_nhan] [bigint] NULL,
	[id_bac_si] [bigint] NULL,
	[id_thu_ngan] [bigint] NULL,
	[ngay_ke] [datetime] NULL,
	[so_ngay_uong] [int] NULL,
	[tong_tien] [decimal](18, 2) NULL,
	[ghi_chu] [varchar](255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[nguoi_dung](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[ten_dang_nhap] [nvarchar](100) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[mat_khau] [varchar](255) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[salt] [varchar](255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[ma_nv] [varchar](30) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[ho_ten] [nvarchar](150) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[chuc_danh] [varchar](100) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[khoa_phong] [varchar](100) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[cccd] [varchar](20) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[so_dien_thoai] [varchar](20) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[email] [varchar](120) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[hoat_dong] [bit] NULL,
	[lan_dang_nhap_cuoi] [datetime] NULL,
	[so_lan_sai] [int] NULL,
	[so_lan_khoa] [int] NULL,
	[created_at] [datetime] NULL,
	[updated_at] [datetime] NULL,
	[anh_dai_dien] [nvarchar](500) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF),
UNIQUE NONCLUSTERED
(
	[ma_nv] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF),
 CONSTRAINT [UQ__nguoi_du__363698B38CCFD743] UNIQUE NONCLUSTERED
(
	[ten_dang_nhap] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ma_xac_thuc](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[id_nguoi_dung] [bigint] NOT NULL,
	[ma_otp] [varchar](20) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[loai] [varchar](20) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[thoi_gian_tao] [datetime] NOT NULL,
	[thoi_gian_het_han] [datetime] NOT NULL,
	[da_su_dung] [bit] NOT NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[permission_audit_logs](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[entity_type] [varchar](30) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[entity_id] [bigint] NULL,
	[action] [varchar](100) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[changed_by_user_id] [bigint] NULL,
	[changed_by_username] [nvarchar](150) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[target_user_id] [bigint] NULL,
	[target_role_id] [int] NULL,
	[note] [nvarchar](500) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[before_data] [nvarchar](max) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[after_data] [nvarchar](max) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[created_at] [datetime] NOT NULL,
 CONSTRAINT [PK_permission_audit_logs] PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[nhom_thuoc](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[ten] [nvarchar](200) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[mo_ta] [nvarchar](500) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF),
UNIQUE NONCLUSTERED
(
	[ten] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[nhom_dvkt](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[ten_nhom] [nvarchar](255) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[mo_ta] [nvarchar](max) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[hoat_dong] [bit] NOT NULL,
	[created_at] [datetime] NULL,
	[updated_at] [datetime] NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[nhom_dich_vu](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[ten] [nvarchar](200) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[mo_ta] [nvarchar](500) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[vai_tro](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[ten] [varchar](50) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[mo_ta] [nvarchar](255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF),
UNIQUE NONCLUSTERED
(
	[ten] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[support_requests](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[requester_user_id] [bigint] NOT NULL,
	[subject] [nvarchar](180) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[description] [nvarchar](3000) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[category] [varchar](40) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[priority] [varchar](20) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[status] [varchar](20) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[page_url] [nvarchar](1000) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[route] [nvarchar](300) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[user_agent] [nvarchar](1000) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[context_json] [nvarchar](max) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[admin_note] [nvarchar](3000) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[assigned_to_user_id] [bigint] NULL,
	[created_at] [datetime] NOT NULL,
	[updated_at] [datetime] NOT NULL,
	[resolved_at] [datetime] NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[system_notifications](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[title] [nvarchar](180) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[message] [nvarchar](2000) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[severity] [varchar](20) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[target_role] [varchar](80) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[target_user_id] [bigint] NULL,
	[created_by_user_id] [bigint] NULL,
	[created_at] [datetime] NOT NULL,
	[expires_at] [datetime] NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[system_notification_reads](
	[notification_id] [bigint] NOT NULL,
	[user_id] [bigint] NOT NULL,
	[read_at] [datetime] NOT NULL,
 CONSTRAINT [PK_system_notification_reads] PRIMARY KEY CLUSTERED
(
	[notification_id] ASC,
	[user_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[nguoi_dung_vai_tro](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[id_nguoi_dung] [bigint] NULL,
	[id_vai_tro] [int] NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[nguoi_dung_khu](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[id_nguoi_dung] [bigint] NOT NULL,
	[id_khu_tiep_don] [int] NOT NULL,
	[la_mac_dinh] [bit] NOT NULL,
	[hoat_dong] [bit] NOT NULL,
	[created_at] [datetime] NOT NULL,
 CONSTRAINT [PK_nguoi_dung_khu] PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[chi_tiet_don_thuoc](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[id_don_thuoc] [bigint] NULL,
	[id_thuoc] [bigint] NULL,
	[so_luong] [int] NULL,
	[don_vi] [nvarchar](50) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[dung_tich] [nvarchar](50) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[sang] [int] NULL,
	[trua] [int] NULL,
	[chieu] [int] NULL,
	[toi] [int] NULL,
	[khuya] [int] NULL,
	[so_ngay_uong] [int] NULL,
	[ghi_chu] [nvarchar](255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[thuoc](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[ma] [varchar](50) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[ten] [varchar](150) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[ham_luong] [nvarchar](50) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[don_vi] [nvarchar](50) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[hang_sx] [nvarchar](100) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[han_su_dung] [date] NULL,
	[so_luong_ton] [int] NULL,
	[don_gia] [decimal](18, 2) NULL,
	[mo_ta] [nvarchar](500) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[hoat_dong] [bit] NULL,
	[id_nhom] [int] NULL,
	[hoat_chat] [nvarchar](200) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[loai_thuoc] [nvarchar](60) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF),
UNIQUE NONCLUSTERED
(
	[ma] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[quyen](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[id_chuc_nang] [int] NULL,
	[ma_quyen] [varchar](50) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[xem] [bit] NULL,
	[them] [bit] NULL,
	[sua] [bit] NULL,
	[xoa] [bit] NULL,
	[xuat] [bit] NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF),
 CONSTRAINT [UQ_quyen_ma_quyen] UNIQUE NONCLUSTERED
(
	[ma_quyen] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[quay_tiep_don](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[id_khu_tiep_don] [int] NOT NULL,
	[ma_quay] [varchar](30) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[ten_quay] [nvarchar](150) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[thu_tu] [int] NULL,
	[hoat_dong] [bit] NOT NULL,
	[created_at] [datetime] NOT NULL,
	[updated_at] [datetime] NULL,
 CONSTRAINT [PK_quay_tiep_don] PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[phong_thuc_hien](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[ten_phong] [nvarchar](100) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[tang] [int] NULL,
	[hoat_dong] [bit] NULL,
	[id_khu_tiep_don] [int] NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[phong_kham](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[ma_phong] [varchar](20) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[ten_phong] [nvarchar](255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[khoa_phong] [nvarchar](255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[mo_ta] [nvarchar](max) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[hoat_dong] [bit] NULL,
	[id_khu_tiep_don] [int] NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF),
UNIQUE NONCLUSTERED
(
	[ma_phong] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[lich_su_dang_nhap](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[id_nguoi_dung] [bigint] NULL,
	[thoi_gian] [datetime] NULL,
	[ip] [varchar](50) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[thiet_bi] [varchar](100) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[ket_qua] [varchar](50) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[chi_dinh_dvkt](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[id_lan_kham] [bigint] NOT NULL,
	[id_dvkt] [int] NOT NULL,
	[so_luong] [int] NOT NULL,
	[ghi_chu] [nvarchar](max) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[trang_thai] [varchar](20) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[created_at] [datetime] NULL,
	[id_nguoi_thuc_hien] [bigint] NULL,
	[nhan_luc] [datetime] NULL,
	[hoan_thanh_luc] [datetime] NULL,
	[bac_si_da_doc_ket_qua] [bit] NOT NULL,
	[bac_si_doc_ket_qua_luc] [datetime] NULL,
	[id_bac_si_doc_ket_qua] [bigint] NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[dvkt](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[ma_dvkt] [varchar](50) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[ten_dvkt] [nvarchar](255) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[mo_ta] [nvarchar](max) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[id_nhom] [int] NOT NULL,
	[don_vi] [nvarchar](50) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[thoi_gian_du_kien] [int] NULL,
	[hoat_dong] [bit] NOT NULL,
	[created_at] [datetime] NULL,
	[updated_at] [datetime] NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF),
UNIQUE NONCLUSTERED
(
	[ma_dvkt] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[dat_lich](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[ma_dat_lich] [varchar](30) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[id_benh_nhan] [bigint] NULL,
	[id_bac_si] [bigint] NULL,
	[id_bo_chi_dinh] [bigint] NULL,
	[ngay] [date] NOT NULL,
	[gio_bat_dau] [time](7) NOT NULL,
	[gio_ket_thuc] [time](7) NULL,
	[id_phong] [int] NULL,
	[trang_thai] [varchar](50) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[id_nguoi_tao] [bigint] NULL,
	[id_nguoi_cap_nhat] [bigint] NULL,
	[thoi_gian_nhac] [datetime] NULL,
	[da_gui_nhac] [bit] NULL,
	[ghi_chu] [varchar](255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[active] [bit] NULL,
	[created_at] [datetime] NULL,
	[updated_at] [datetime] NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF),
UNIQUE NONCLUSTERED
(
	[ma_dat_lich] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[bao_cao](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[ma_bc] [varchar](20) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[loai] [varchar](100) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[tham_so] [nvarchar](max) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[ngay_bat_dau] [date] NULL,
	[ngay_ket_thuc] [date] NULL,
	[dinh_dang] [varchar](20) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[ngay_tao] [datetime] NULL,
	[id_nguoi_dung] [bigint] NULL,
	[du_lieu] [nvarchar](max) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[bao_cao_xuat](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[id_bao_cao] [bigint] NULL,
	[id_nguoi_dung] [bigint] NULL,
	[dinh_dang] [varchar](20) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[thoi_gian_bat_dau] [datetime] NULL,
	[thoi_gian_ket_thuc] [datetime] NULL,
	[duong_dan_file] [varchar](255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[benh_nhan_di_ung_thuoc](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[id_benh_nhan] [bigint] NOT NULL,
	[id_thuoc] [bigint] NOT NULL,
	[ghi_chu] [nvarchar](255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[lan_kham_dich_vu](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[id_lan_kham] [bigint] NULL,
	[id_dich_vu] [bigint] NULL,
	[so_luong] [int] NULL,
	[don_gia] [decimal](18, 2) NULL,
	[trang_thai_thuc_hien] [varchar](50) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[ghi_chu] [nvarchar](255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[dich_vu](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[id_nhom] [int] NULL,
	[id_phong] [int] NULL,
	[ma] [varchar](50) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[ten] [nvarchar](255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[don_vi_tinh] [nvarchar](50) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[mo_ta] [nvarchar](255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[hoat_dong] [bit] NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF),
UNIQUE NONCLUSTERED
(
	[ma] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[chong_chi_dinh_benh_thuoc](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[id_benh] [bigint] NOT NULL,
	[id_thuoc] [bigint] NOT NULL,
	[canh_bao] [nvarchar](500) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[ghi_chu] [nvarchar](255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[bac_si_phong](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[id_bac_si] [bigint] NOT NULL,
	[id_phong] [int] NOT NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[phieu_kho](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[ma_phieu] [varchar](30) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[id_thuoc] [bigint] NULL,
	[loai] [varchar](20) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[so_lo] [varchar](50) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[han_su_dung] [date] NULL,
	[so_luong] [int] NULL,
	[don_gia] [decimal](18, 2) NULL,
	[nguoi_lap] [bigint] NULL,
	[nguoi_duyet] [bigint] NULL,
	[thoi_gian] [datetime] NULL,
	[ghi_chu] [varchar](255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF),
UNIQUE NONCLUSTERED
(
	[ma_phieu] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[dvkt_phong](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[id_dvkt] [int] NULL,
	[id_phong] [int] NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[dvkt_gia](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[id_dvkt] [int] NOT NULL,
	[don_gia] [decimal](18, 2) NOT NULL,
	[tu_ngay] [date] NOT NULL,
	[den_ngay] [date] NULL,
	[ghi_chu] [nvarchar](max) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[dvkt_ket_qua_chi_tiet](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[id_ket_qua] [bigint] NOT NULL,
	[id_chi_tieu] [int] NOT NULL,
	[gia_tri] [nvarchar](100) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[danh_gia] [nvarchar](100) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[dvkt_chi_tieu](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[id_dvkt] [int] NOT NULL,
	[ten_chi_tieu] [nvarchar](255) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[don_vi] [nvarchar](50) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[gia_tri_tham_chieu] [nvarchar](100) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[thu_tu] [int] NULL,
	[hoat_dong] [bit] NULL,
	[gioi_han_thap] [float] NULL,
	[gioi_han_cao] [float] NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[thuoc_lieu_chuan](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[id_thuoc] [bigint] NOT NULL,
	[lieu_toi_da_ngay] [int] NOT NULL,
	[ghi_chu] [nvarchar](255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[thuoc_gia](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[id_thuoc] [bigint] NOT NULL,
	[don_gia] [decimal](18, 2) NOT NULL,
	[ngay_ap_dung] [date] NOT NULL,
	[ngay_het_han] [date] NULL,
	[doi_tuong_ap_dung] [nvarchar](200) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[ghi_chu] [nvarchar](300) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[hoat_dong] [bit] NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[lan_kham](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[id_ho_so] [bigint] NULL,
	[id_benh_nhan] [bigint] NULL,
	[id_bac_si] [bigint] NULL,
	[id_dat_lich] [bigint] NULL,
	[id_tiep_don] [bigint] NULL,
	[id_phong] [int] NULL,
	[thoi_gian_bat_dau] [datetime] NULL,
	[thoi_gian_ket_thuc] [datetime] NULL,
	[ly_do] [varchar](255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[chan_doan_so_bo] [varchar](255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[chan_doan_cuoi] [varchar](255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[ket_qua_kham] [nvarchar](255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[huong_xu_tri] [varchar](50) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[ghi_chu] [nvarchar](max) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[trang_thai] [varchar](30) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[created_at] [datetime] NULL,
	[updated_at] [datetime] NULL,
	[id_benh] [bigint] NULL,
	[IdSinhHieu] [bigint] NULL,
	[benh_kem_theo] [nvarchar](500) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[kham_benh_audit_logs](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[id_lan_kham] [bigint] NULL,
	[id_ho_so] [bigint] NULL,
	[id_benh_nhan] [bigint] NULL,
	[id_phong] [int] NULL,
	[id_bac_si_chu_so_huu] [bigint] NULL,
	[id_nguoi_thuc_hien] [bigint] NULL,
	[ten_nguoi_thuc_hien] [nvarchar](150) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[hanh_dong] [varchar](80) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[doi_tuong] [varchar](50) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[id_doi_tuong] [bigint] NULL,
	[ly_do] [nvarchar](500) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[du_lieu_truoc] [nvarchar](max) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[du_lieu_sau] [nvarchar](max) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[ip_address] [varchar](60) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[user_agent] [nvarchar](300) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[created_at] [datetime] NOT NULL,
 CONSTRAINT [PK_kham_benh_audit_logs] PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ho_so_benh_an](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[id_benh_nhan] [bigint] NULL,
	[ma_hs] [varchar](30) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[ngay_tao] [datetime] NULL,
	[id_nguoi_tao] [bigint] NULL,
	[chan_doan] [varchar](255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[ghi_chu] [nvarchar](max) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[trang_thai] [varchar](50) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[UpdatedAt] [datetime] NULL,
	[ngay_tao_date]  AS (CONVERT([date],[ngay_tao])) PERSISTED,
	[id_khu_tiep_don] [int] NULL,
	[id_quay_tiep_don] [int] NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF),
UNIQUE NONCLUSTERED
(
	[ma_hs] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[vai_tro_quyen](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[id_vai_tro] [int] NULL,
	[id_quyen] [int] NULL,
	[xem] [bit] NULL,
	[them] [bit] NULL,
	[sua] [bit] NULL,
	[xoa] [bit] NULL,
	[xuat] [bit] NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tuong_tac_thuoc](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[id_thuoc_1] [bigint] NOT NULL,
	[id_thuoc_2] [bigint] NOT NULL,
	[muc_do] [int] NOT NULL,
	[canh_bao] [nvarchar](500) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tiepdon_trangthai_logs](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[id_ho_so] [bigint] NOT NULL,
	[from_trang_thai] [varchar](30) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[to_trang_thai] [varchar](30) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[action] [varchar](80) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[note] [nvarchar](500) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[id_nguoi_dung] [bigint] NULL,
	[created_at] [datetime] NOT NULL,
	[metadata] [nvarchar](max) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
 CONSTRAINT [PK_tiepdon_trangthai_logs] PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[dich_vu_gia](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[id_dich_vu] [bigint] NULL,
	[don_gia] [decimal](18, 2) NOT NULL,
	[ngay_ap_dung] [date] NOT NULL,
	[ngay_het_han] [date] NULL,
	[doi_tuong_ap_dung] [nvarchar](255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[id_phong] [int] NULL,
	[ghi_chu] [nvarchar](255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[hoat_dong] [bit] NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[bo_chi_dinh_ct](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[id_bo] [bigint] NULL,
	[id_dich_vu] [bigint] NULL,
	[so_luong] [int] NULL,
	[ghi_chu] [varchar](255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
)

GO
SET ANSI_PADDING ON

GO
CREATE UNIQUE NONCLUSTERED INDEX [UQ_BenhNhan_CCCD] ON [dbo].[benh_nhan]
(
	[cccd] ASC
)
WHERE ([cccd] IS NOT NULL)
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
GO
SET ANSI_PADDING ON

GO
CREATE UNIQUE NONCLUSTERED INDEX [UQ_BenhNhan_SDT] ON [dbo].[benh_nhan]
(
	[so_dien_thoai] ASC
)
WHERE ([so_dien_thoai] IS NOT NULL)
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
GO
CREATE UNIQUE NONCLUSTERED INDEX [UX_lan_kham_benh_kem_theo] ON [dbo].[lan_kham_benh_kem_theo]
(
	[id_lan_kham] ASC,
	[id_benh] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
GO
SET ANSI_PADDING ON

GO
CREATE UNIQUE NONCLUSTERED INDEX [UX_khu_tiep_don_ma] ON [dbo].[khu_tiep_don]
(
	[ma_khu] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
GO
SET ANSI_PADDING ON

GO
CREATE NONCLUSTERED INDEX [IX_giay_ket_luan_kham_lankham_type_time] ON [dbo].[giay_ket_luan_kham]
(
	[id_lan_kham] ASC,
	[loai_giay] ASC,
	[created_at] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
GO
CREATE NONCLUSTERED INDEX [IX_giay_hen_kham_lai_lankham_time] ON [dbo].[giay_hen_kham_lai]
(
	[id_lan_kham] ASC,
	[created_at] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
GO
CREATE NONCLUSTERED INDEX [IX_permission_audit_logs_created_at] ON [dbo].[permission_audit_logs]
(
	[created_at] DESC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
GO
CREATE NONCLUSTERED INDEX [IX_permission_audit_logs_target_role] ON [dbo].[permission_audit_logs]
(
	[target_role_id] ASC,
	[created_at] DESC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
GO
CREATE NONCLUSTERED INDEX [IX_permission_audit_logs_target_user] ON [dbo].[permission_audit_logs]
(
	[target_user_id] ASC,
	[created_at] DESC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
GO
SET ANSI_PADDING ON

GO
CREATE NONCLUSTERED INDEX [IX_support_requests_status_time] ON [dbo].[support_requests]
(
	[status] ASC,
	[created_at] DESC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
GO
CREATE NONCLUSTERED INDEX [IX_system_notifications_created] ON [dbo].[system_notifications]
(
	[created_at] DESC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
GO
CREATE UNIQUE NONCLUSTERED INDEX [UX_nguoi_dung_khu_user_khu] ON [dbo].[nguoi_dung_khu]
(
	[id_nguoi_dung] ASC,
	[id_khu_tiep_don] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
GO
SET ANSI_PADDING ON

GO
CREATE NONCLUSTERED INDEX [IX_thuoc_hoat_chat] ON [dbo].[thuoc]
(
	[hoat_chat] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
GO
SET ANSI_PADDING ON

GO
CREATE UNIQUE NONCLUSTERED INDEX [UX_quay_tiep_don_khu_ma] ON [dbo].[quay_tiep_don]
(
	[id_khu_tiep_don] ASC,
	[ma_quay] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
GO
CREATE NONCLUSTERED INDEX [IX_chi_dinh_dvkt_lankham_created] ON [dbo].[chi_dinh_dvkt]
(
	[id_lan_kham] ASC,
	[created_at] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
GO
CREATE NONCLUSTERED INDEX [IX_kham_benh_audit_logs_actor_time] ON [dbo].[kham_benh_audit_logs]
(
	[id_nguoi_thuc_hien] ASC,
	[created_at] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
GO
CREATE NONCLUSTERED INDEX [IX_kham_benh_audit_logs_hoso_time] ON [dbo].[kham_benh_audit_logs]
(
	[id_ho_so] ASC,
	[created_at] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
GO
CREATE NONCLUSTERED INDEX [IX_kham_benh_audit_logs_lankham_time] ON [dbo].[kham_benh_audit_logs]
(
	[id_lan_kham] ASC,
	[created_at] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
GO
CREATE NONCLUSTERED INDEX [IX_tiepdon_trangthai_logs_hoso_time] ON [dbo].[tiepdon_trangthai_logs]
(
	[id_ho_so] ASC,
	[created_at] DESC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
GO
ALTER TABLE [dbo].[SinhHieu] ADD  DEFAULT (getdate()) FOR [ThoiGianDo]
GO
ALTER TABLE [dbo].[dvkt_thuc_hien_log] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[dvkt_ket_qua] ADD  DEFAULT ('pending') FOR [trang_thai]
GO
ALTER TABLE [dbo].[benh_nhan] ADD  CONSTRAINT [DF_benh_nhan_is_potential_duplicate]  DEFAULT ((0)) FOR [is_potential_duplicate]
GO
ALTER TABLE [dbo].[lan_kham_benh_kem_theo] ADD  CONSTRAINT [DF_lan_kham_benh_kem_theo_thu_tu]  DEFAULT ((1)) FOR [thu_tu]
GO
ALTER TABLE [dbo].[lan_kham_benh_kem_theo] ADD  CONSTRAINT [DF_lan_kham_benh_kem_theo_created]  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[khu_tiep_don] ADD  CONSTRAINT [DF_khu_tiep_don_hoat_dong]  DEFAULT ((1)) FOR [hoat_dong]
GO
ALTER TABLE [dbo].[khu_tiep_don] ADD  CONSTRAINT [DF_khu_tiep_don_created]  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[giay_ket_luan_kham] ADD  CONSTRAINT [DF_giay_ket_luan_kham_da_ky]  DEFAULT ((0)) FOR [da_ky]
GO
ALTER TABLE [dbo].[giay_ket_luan_kham] ADD  CONSTRAINT [DF_giay_ket_luan_kham_created]  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[giay_hen_kham_lai] ADD  CONSTRAINT [DF_giay_hen_kham_lai_da_ky]  DEFAULT ((0)) FOR [da_ky]
GO
ALTER TABLE [dbo].[giay_hen_kham_lai] ADD  CONSTRAINT [DF_giay_hen_kham_lai_created]  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[ma_xac_thuc] ADD  DEFAULT ((0)) FOR [da_su_dung]
GO
ALTER TABLE [dbo].[permission_audit_logs] ADD  CONSTRAINT [DF_permission_audit_logs_created_at]  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[nhom_dvkt] ADD  DEFAULT ((1)) FOR [hoat_dong]
GO
ALTER TABLE [dbo].[nhom_dvkt] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[nhom_dvkt] ADD  DEFAULT (getdate()) FOR [updated_at]
GO
ALTER TABLE [dbo].[support_requests] ADD  CONSTRAINT [DF_support_requests_created]  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[support_requests] ADD  CONSTRAINT [DF_support_requests_updated]  DEFAULT (getdate()) FOR [updated_at]
GO
ALTER TABLE [dbo].[system_notifications] ADD  CONSTRAINT [DF_system_notifications_severity]  DEFAULT ('INFO') FOR [severity]
GO
ALTER TABLE [dbo].[system_notifications] ADD  CONSTRAINT [DF_system_notifications_created]  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[system_notification_reads] ADD  CONSTRAINT [DF_system_notification_reads_at]  DEFAULT (getdate()) FOR [read_at]
GO
ALTER TABLE [dbo].[nguoi_dung_khu] ADD  CONSTRAINT [DF_nguoi_dung_khu_mac_dinh]  DEFAULT ((0)) FOR [la_mac_dinh]
GO
ALTER TABLE [dbo].[nguoi_dung_khu] ADD  CONSTRAINT [DF_nguoi_dung_khu_hoat_dong]  DEFAULT ((1)) FOR [hoat_dong]
GO
ALTER TABLE [dbo].[nguoi_dung_khu] ADD  CONSTRAINT [DF_nguoi_dung_khu_created]  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[quay_tiep_don] ADD  CONSTRAINT [DF_quay_tiep_don_hoat_dong]  DEFAULT ((1)) FOR [hoat_dong]
GO
ALTER TABLE [dbo].[quay_tiep_don] ADD  CONSTRAINT [DF_quay_tiep_don_created]  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[phong_thuc_hien] ADD  DEFAULT ((1)) FOR [hoat_dong]
GO
ALTER TABLE [dbo].[chi_dinh_dvkt] ADD  DEFAULT ((1)) FOR [so_luong]
GO
ALTER TABLE [dbo].[chi_dinh_dvkt] ADD  DEFAULT ('pending') FOR [trang_thai]
GO
ALTER TABLE [dbo].[chi_dinh_dvkt] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[chi_dinh_dvkt] ADD  CONSTRAINT [DF_chi_dinh_dvkt_bac_si_da_doc_ket_qua]  DEFAULT ((0)) FOR [bac_si_da_doc_ket_qua]
GO
ALTER TABLE [dbo].[dvkt] ADD  DEFAULT ((1)) FOR [hoat_dong]
GO
ALTER TABLE [dbo].[dvkt] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[dvkt] ADD  DEFAULT (getdate()) FOR [updated_at]
GO
ALTER TABLE [dbo].[dvkt_chi_tieu] ADD  DEFAULT ((1)) FOR [hoat_dong]
GO
ALTER TABLE [dbo].[thuoc_gia] ADD  DEFAULT ((1)) FOR [hoat_dong]
GO
ALTER TABLE [dbo].[kham_benh_audit_logs] ADD  CONSTRAINT [DF_kham_benh_audit_logs_created]  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[vai_tro_quyen] ADD  DEFAULT ((0)) FOR [xem]
GO
ALTER TABLE [dbo].[vai_tro_quyen] ADD  DEFAULT ((0)) FOR [them]
GO
ALTER TABLE [dbo].[vai_tro_quyen] ADD  DEFAULT ((0)) FOR [sua]
GO
ALTER TABLE [dbo].[vai_tro_quyen] ADD  DEFAULT ((0)) FOR [xoa]
GO
ALTER TABLE [dbo].[vai_tro_quyen] ADD  DEFAULT ((0)) FOR [xuat]
GO
ALTER TABLE [dbo].[tiepdon_trangthai_logs] ADD  CONSTRAINT [DF_tiepdon_trangthai_logs_created_at]  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[SinhHieu]  WITH CHECK ADD FOREIGN KEY([IdLanKham])
REFERENCES [dbo].[lan_kham] ([id])
GO
ALTER TABLE [dbo].[chi_tiet_hoa_don]  WITH CHECK ADD FOREIGN KEY([id_hoa_don])
REFERENCES [dbo].[hoa_don] ([id])
GO
ALTER TABLE [dbo].[dvkt_thuc_hien_log]  WITH CHECK ADD  CONSTRAINT [FK_DvktThucHienLog_ChiDinhDvkt] FOREIGN KEY([id_chi_dinh_dvkt])
REFERENCES [dbo].[chi_dinh_dvkt] ([id])
GO
ALTER TABLE [dbo].[dvkt_thuc_hien_log] CHECK CONSTRAINT [FK_DvktThucHienLog_ChiDinhDvkt]
GO
ALTER TABLE [dbo].[dvkt_ket_qua]  WITH CHECK ADD  CONSTRAINT [FK_ket_qua_dvkt_chidinh] FOREIGN KEY([id_chi_dinh_dvkt])
REFERENCES [dbo].[chi_dinh_dvkt] ([id])
GO
ALTER TABLE [dbo].[dvkt_ket_qua] CHECK CONSTRAINT [FK_ket_qua_dvkt_chidinh]
GO
ALTER TABLE [dbo].[lan_kham_benh_kem_theo]  WITH CHECK ADD  CONSTRAINT [FK_lan_kham_benh_kem_theo_benh] FOREIGN KEY([id_benh])
REFERENCES [dbo].[benh] ([id])
GO
ALTER TABLE [dbo].[lan_kham_benh_kem_theo] CHECK CONSTRAINT [FK_lan_kham_benh_kem_theo_benh]
GO
ALTER TABLE [dbo].[lan_kham_benh_kem_theo]  WITH CHECK ADD  CONSTRAINT [FK_lan_kham_benh_kem_theo_lan_kham] FOREIGN KEY([id_lan_kham])
REFERENCES [dbo].[lan_kham] ([id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[lan_kham_benh_kem_theo] CHECK CONSTRAINT [FK_lan_kham_benh_kem_theo_lan_kham]
GO
ALTER TABLE [dbo].[hoa_don]  WITH CHECK ADD FOREIGN KEY([id_benh_nhan])
REFERENCES [dbo].[benh_nhan] ([id])
GO
ALTER TABLE [dbo].[hoa_don]  WITH CHECK ADD FOREIGN KEY([id_lan_kham])
REFERENCES [dbo].[lan_kham] ([id])
GO
ALTER TABLE [dbo].[hoa_don]  WITH CHECK ADD FOREIGN KEY([id_thu_ngan])
REFERENCES [dbo].[nguoi_dung] ([id])
GO
ALTER TABLE [dbo].[giay_ket_luan_kham]  WITH CHECK ADD  CONSTRAINT [FK_giay_ket_luan_kham_bac_si] FOREIGN KEY([id_bac_si])
REFERENCES [dbo].[nguoi_dung] ([id])
GO
ALTER TABLE [dbo].[giay_ket_luan_kham] CHECK CONSTRAINT [FK_giay_ket_luan_kham_bac_si]
GO
ALTER TABLE [dbo].[giay_ket_luan_kham]  WITH CHECK ADD  CONSTRAINT [FK_giay_ket_luan_kham_benh_nhan] FOREIGN KEY([id_benh_nhan])
REFERENCES [dbo].[benh_nhan] ([id])
GO
ALTER TABLE [dbo].[giay_ket_luan_kham] CHECK CONSTRAINT [FK_giay_ket_luan_kham_benh_nhan]
GO
ALTER TABLE [dbo].[giay_ket_luan_kham]  WITH CHECK ADD  CONSTRAINT [FK_giay_ket_luan_kham_lan_kham] FOREIGN KEY([id_lan_kham])
REFERENCES [dbo].[lan_kham] ([id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[giay_ket_luan_kham] CHECK CONSTRAINT [FK_giay_ket_luan_kham_lan_kham]
GO
ALTER TABLE [dbo].[giay_hen_kham_lai]  WITH CHECK ADD  CONSTRAINT [FK_giay_hen_kham_lai_bac_si] FOREIGN KEY([id_bac_si])
REFERENCES [dbo].[nguoi_dung] ([id])
GO
ALTER TABLE [dbo].[giay_hen_kham_lai] CHECK CONSTRAINT [FK_giay_hen_kham_lai_bac_si]
GO
ALTER TABLE [dbo].[giay_hen_kham_lai]  WITH CHECK ADD  CONSTRAINT [FK_giay_hen_kham_lai_benh_nhan] FOREIGN KEY([id_benh_nhan])
REFERENCES [dbo].[benh_nhan] ([id])
GO
ALTER TABLE [dbo].[giay_hen_kham_lai] CHECK CONSTRAINT [FK_giay_hen_kham_lai_benh_nhan]
GO
ALTER TABLE [dbo].[giay_hen_kham_lai]  WITH CHECK ADD  CONSTRAINT [FK_giay_hen_kham_lai_lan_kham] FOREIGN KEY([id_lan_kham])
REFERENCES [dbo].[lan_kham] ([id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[giay_hen_kham_lai] CHECK CONSTRAINT [FK_giay_hen_kham_lai_lan_kham]
GO
ALTER TABLE [dbo].[don_thuoc]  WITH CHECK ADD FOREIGN KEY([id_bac_si])
REFERENCES [dbo].[nguoi_dung] ([id])
GO
ALTER TABLE [dbo].[don_thuoc]  WITH CHECK ADD FOREIGN KEY([id_benh_nhan])
REFERENCES [dbo].[benh_nhan] ([id])
GO
ALTER TABLE [dbo].[don_thuoc]  WITH CHECK ADD FOREIGN KEY([id_lan_kham])
REFERENCES [dbo].[lan_kham] ([id])
GO
ALTER TABLE [dbo].[don_thuoc]  WITH CHECK ADD FOREIGN KEY([id_thu_ngan])
REFERENCES [dbo].[nguoi_dung] ([id])
GO
ALTER TABLE [dbo].[system_notification_reads]  WITH CHECK ADD  CONSTRAINT [FK_system_notification_reads_notification] FOREIGN KEY([notification_id])
REFERENCES [dbo].[system_notifications] ([id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[system_notification_reads] CHECK CONSTRAINT [FK_system_notification_reads_notification]
GO
ALTER TABLE [dbo].[nguoi_dung_vai_tro]  WITH CHECK ADD FOREIGN KEY([id_nguoi_dung])
REFERENCES [dbo].[nguoi_dung] ([id])
GO
ALTER TABLE [dbo].[nguoi_dung_vai_tro]  WITH CHECK ADD FOREIGN KEY([id_vai_tro])
REFERENCES [dbo].[vai_tro] ([id])
GO
ALTER TABLE [dbo].[nguoi_dung_khu]  WITH CHECK ADD  CONSTRAINT [FK_nguoi_dung_khu_khu] FOREIGN KEY([id_khu_tiep_don])
REFERENCES [dbo].[khu_tiep_don] ([id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[nguoi_dung_khu] CHECK CONSTRAINT [FK_nguoi_dung_khu_khu]
GO
ALTER TABLE [dbo].[nguoi_dung_khu]  WITH CHECK ADD  CONSTRAINT [FK_nguoi_dung_khu_user] FOREIGN KEY([id_nguoi_dung])
REFERENCES [dbo].[nguoi_dung] ([id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[nguoi_dung_khu] CHECK CONSTRAINT [FK_nguoi_dung_khu_user]
GO
ALTER TABLE [dbo].[chi_tiet_don_thuoc]  WITH CHECK ADD FOREIGN KEY([id_don_thuoc])
REFERENCES [dbo].[don_thuoc] ([id])
GO
ALTER TABLE [dbo].[chi_tiet_don_thuoc]  WITH CHECK ADD FOREIGN KEY([id_thuoc])
REFERENCES [dbo].[thuoc] ([id])
GO
ALTER TABLE [dbo].[thuoc]  WITH CHECK ADD  CONSTRAINT [FK_thuoc_nhom] FOREIGN KEY([id_nhom])
REFERENCES [dbo].[nhom_thuoc] ([id])
ON UPDATE CASCADE
ON DELETE SET NULL
GO
ALTER TABLE [dbo].[thuoc] CHECK CONSTRAINT [FK_thuoc_nhom]
GO
ALTER TABLE [dbo].[quyen]  WITH CHECK ADD FOREIGN KEY([id_chuc_nang])
REFERENCES [dbo].[chuc_nang] ([id])
GO
ALTER TABLE [dbo].[quay_tiep_don]  WITH CHECK ADD  CONSTRAINT [FK_quay_tiep_don_khu] FOREIGN KEY([id_khu_tiep_don])
REFERENCES [dbo].[khu_tiep_don] ([id])
GO
ALTER TABLE [dbo].[quay_tiep_don] CHECK CONSTRAINT [FK_quay_tiep_don_khu]
GO
ALTER TABLE [dbo].[phong_thuc_hien]  WITH CHECK ADD  CONSTRAINT [FK_phong_thuc_hien_khu_tiep_don] FOREIGN KEY([id_khu_tiep_don])
REFERENCES [dbo].[khu_tiep_don] ([id])
GO
ALTER TABLE [dbo].[phong_thuc_hien] CHECK CONSTRAINT [FK_phong_thuc_hien_khu_tiep_don]
GO
ALTER TABLE [dbo].[phong_kham]  WITH CHECK ADD  CONSTRAINT [FK_phong_kham_khu_tiep_don] FOREIGN KEY([id_khu_tiep_don])
REFERENCES [dbo].[khu_tiep_don] ([id])
GO
ALTER TABLE [dbo].[phong_kham] CHECK CONSTRAINT [FK_phong_kham_khu_tiep_don]
GO
ALTER TABLE [dbo].[lich_su_dang_nhap]  WITH CHECK ADD FOREIGN KEY([id_nguoi_dung])
REFERENCES [dbo].[nguoi_dung] ([id])
GO
ALTER TABLE [dbo].[chi_dinh_dvkt]  WITH CHECK ADD  CONSTRAINT [FK_chi_dinh_dvkt_bac_si_doc_ket_qua] FOREIGN KEY([id_bac_si_doc_ket_qua])
REFERENCES [dbo].[nguoi_dung] ([id])
GO
ALTER TABLE [dbo].[chi_dinh_dvkt] CHECK CONSTRAINT [FK_chi_dinh_dvkt_bac_si_doc_ket_qua]
GO
ALTER TABLE [dbo].[chi_dinh_dvkt]  WITH CHECK ADD  CONSTRAINT [FK_chi_dinh_dvkt_dvkt] FOREIGN KEY([id_dvkt])
REFERENCES [dbo].[dvkt] ([id])
GO
ALTER TABLE [dbo].[chi_dinh_dvkt] CHECK CONSTRAINT [FK_chi_dinh_dvkt_dvkt]
GO
ALTER TABLE [dbo].[chi_dinh_dvkt]  WITH CHECK ADD  CONSTRAINT [FK_chi_dinh_dvkt_lankham] FOREIGN KEY([id_lan_kham])
REFERENCES [dbo].[lan_kham] ([id])
GO
ALTER TABLE [dbo].[chi_dinh_dvkt] CHECK CONSTRAINT [FK_chi_dinh_dvkt_lankham]
GO
ALTER TABLE [dbo].[dvkt]  WITH CHECK ADD  CONSTRAINT [FK_dvkt_nhom] FOREIGN KEY([id_nhom])
REFERENCES [dbo].[nhom_dvkt] ([id])
GO
ALTER TABLE [dbo].[dvkt] CHECK CONSTRAINT [FK_dvkt_nhom]
GO
ALTER TABLE [dbo].[dat_lich]  WITH CHECK ADD FOREIGN KEY([id_bac_si])
REFERENCES [dbo].[nguoi_dung] ([id])
GO
ALTER TABLE [dbo].[dat_lich]  WITH CHECK ADD FOREIGN KEY([id_benh_nhan])
REFERENCES [dbo].[benh_nhan] ([id])
GO
ALTER TABLE [dbo].[dat_lich]  WITH CHECK ADD FOREIGN KEY([id_bo_chi_dinh])
REFERENCES [dbo].[bo_chi_dinh] ([id])
GO
ALTER TABLE [dbo].[dat_lich]  WITH CHECK ADD FOREIGN KEY([id_nguoi_tao])
REFERENCES [dbo].[nguoi_dung] ([id])
GO
ALTER TABLE [dbo].[dat_lich]  WITH CHECK ADD FOREIGN KEY([id_nguoi_cap_nhat])
REFERENCES [dbo].[nguoi_dung] ([id])
GO
ALTER TABLE [dbo].[bao_cao]  WITH CHECK ADD FOREIGN KEY([id_nguoi_dung])
REFERENCES [dbo].[nguoi_dung] ([id])
GO
ALTER TABLE [dbo].[bao_cao_xuat]  WITH CHECK ADD FOREIGN KEY([id_bao_cao])
REFERENCES [dbo].[bao_cao] ([id])
GO
ALTER TABLE [dbo].[bao_cao_xuat]  WITH CHECK ADD FOREIGN KEY([id_nguoi_dung])
REFERENCES [dbo].[nguoi_dung] ([id])
GO
ALTER TABLE [dbo].[benh_nhan_di_ung_thuoc]  WITH CHECK ADD FOREIGN KEY([id_benh_nhan])
REFERENCES [dbo].[benh_nhan] ([id])
GO
ALTER TABLE [dbo].[benh_nhan_di_ung_thuoc]  WITH CHECK ADD FOREIGN KEY([id_thuoc])
REFERENCES [dbo].[thuoc] ([id])
GO
ALTER TABLE [dbo].[lan_kham_dich_vu]  WITH CHECK ADD FOREIGN KEY([id_dich_vu])
REFERENCES [dbo].[dich_vu] ([id])
GO
ALTER TABLE [dbo].[lan_kham_dich_vu]  WITH CHECK ADD FOREIGN KEY([id_lan_kham])
REFERENCES [dbo].[lan_kham] ([id])
GO
ALTER TABLE [dbo].[dich_vu]  WITH CHECK ADD FOREIGN KEY([id_nhom])
REFERENCES [dbo].[nhom_dich_vu] ([id])
GO
ALTER TABLE [dbo].[dich_vu]  WITH CHECK ADD FOREIGN KEY([id_phong])
REFERENCES [dbo].[phong_kham] ([id])
GO
ALTER TABLE [dbo].[chong_chi_dinh_benh_thuoc]  WITH CHECK ADD FOREIGN KEY([id_benh])
REFERENCES [dbo].[benh] ([id])
GO
ALTER TABLE [dbo].[chong_chi_dinh_benh_thuoc]  WITH CHECK ADD FOREIGN KEY([id_thuoc])
REFERENCES [dbo].[thuoc] ([id])
GO
ALTER TABLE [dbo].[bac_si_phong]  WITH CHECK ADD  CONSTRAINT [FK_bac_si_phong_bacsi] FOREIGN KEY([id_bac_si])
REFERENCES [dbo].[nguoi_dung] ([id])
GO
ALTER TABLE [dbo].[bac_si_phong] CHECK CONSTRAINT [FK_bac_si_phong_bacsi]
GO
ALTER TABLE [dbo].[bac_si_phong]  WITH CHECK ADD  CONSTRAINT [FK_bac_si_phong_phong] FOREIGN KEY([id_phong])
REFERENCES [dbo].[phong_kham] ([id])
GO
ALTER TABLE [dbo].[bac_si_phong] CHECK CONSTRAINT [FK_bac_si_phong_phong]
GO
ALTER TABLE [dbo].[phieu_kho]  WITH CHECK ADD FOREIGN KEY([id_thuoc])
REFERENCES [dbo].[thuoc] ([id])
GO
ALTER TABLE [dbo].[phieu_kho]  WITH CHECK ADD FOREIGN KEY([nguoi_lap])
REFERENCES [dbo].[nguoi_dung] ([id])
GO
ALTER TABLE [dbo].[phieu_kho]  WITH CHECK ADD FOREIGN KEY([nguoi_duyet])
REFERENCES [dbo].[nguoi_dung] ([id])
GO
ALTER TABLE [dbo].[dvkt_phong]  WITH CHECK ADD FOREIGN KEY([id_dvkt])
REFERENCES [dbo].[dvkt] ([id])
GO
ALTER TABLE [dbo].[dvkt_phong]  WITH CHECK ADD FOREIGN KEY([id_phong])
REFERENCES [dbo].[phong_thuc_hien] ([id])
GO
ALTER TABLE [dbo].[dvkt_gia]  WITH CHECK ADD  CONSTRAINT [FK_dvkt_gia_dvkt] FOREIGN KEY([id_dvkt])
REFERENCES [dbo].[dvkt] ([id])
GO
ALTER TABLE [dbo].[dvkt_gia] CHECK CONSTRAINT [FK_dvkt_gia_dvkt]
GO
ALTER TABLE [dbo].[dvkt_ket_qua_chi_tiet]  WITH CHECK ADD  CONSTRAINT [FK_kqct_chitieu] FOREIGN KEY([id_chi_tieu])
REFERENCES [dbo].[dvkt_chi_tieu] ([id])
GO
ALTER TABLE [dbo].[dvkt_ket_qua_chi_tiet] CHECK CONSTRAINT [FK_kqct_chitieu]
GO
ALTER TABLE [dbo].[dvkt_ket_qua_chi_tiet]  WITH CHECK ADD  CONSTRAINT [FK_kqct_kq] FOREIGN KEY([id_ket_qua])
REFERENCES [dbo].[dvkt_ket_qua] ([id])
GO
ALTER TABLE [dbo].[dvkt_ket_qua_chi_tiet] CHECK CONSTRAINT [FK_kqct_kq]
GO
ALTER TABLE [dbo].[dvkt_chi_tieu]  WITH CHECK ADD  CONSTRAINT [FK_chitieu_dvkt] FOREIGN KEY([id_dvkt])
REFERENCES [dbo].[dvkt] ([id])
GO
ALTER TABLE [dbo].[dvkt_chi_tieu] CHECK CONSTRAINT [FK_chitieu_dvkt]
GO
ALTER TABLE [dbo].[thuoc_lieu_chuan]  WITH CHECK ADD FOREIGN KEY([id_thuoc])
REFERENCES [dbo].[thuoc] ([id])
GO
ALTER TABLE [dbo].[thuoc_gia]  WITH CHECK ADD  CONSTRAINT [FK_thuoc_gia_thuoc] FOREIGN KEY([id_thuoc])
REFERENCES [dbo].[thuoc] ([id])
ON UPDATE CASCADE
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[thuoc_gia] CHECK CONSTRAINT [FK_thuoc_gia_thuoc]
GO
ALTER TABLE [dbo].[lan_kham]  WITH CHECK ADD FOREIGN KEY([id_bac_si])
REFERENCES [dbo].[nguoi_dung] ([id])
GO
ALTER TABLE [dbo].[lan_kham]  WITH CHECK ADD FOREIGN KEY([id_benh_nhan])
REFERENCES [dbo].[benh_nhan] ([id])
GO
ALTER TABLE [dbo].[lan_kham]  WITH CHECK ADD FOREIGN KEY([id_dat_lich])
REFERENCES [dbo].[dat_lich] ([id])
GO
ALTER TABLE [dbo].[lan_kham]  WITH CHECK ADD FOREIGN KEY([id_ho_so])
REFERENCES [dbo].[ho_so_benh_an] ([id])
GO
ALTER TABLE [dbo].[lan_kham]  WITH CHECK ADD FOREIGN KEY([id_phong])
REFERENCES [dbo].[phong_kham] ([id])
GO
ALTER TABLE [dbo].[lan_kham]  WITH CHECK ADD FOREIGN KEY([id_tiep_don])
REFERENCES [dbo].[nguoi_dung] ([id])
GO
ALTER TABLE [dbo].[lan_kham]  WITH CHECK ADD  CONSTRAINT [FK_lan_kham_benh] FOREIGN KEY([id_benh])
REFERENCES [dbo].[benh] ([id])
GO
ALTER TABLE [dbo].[lan_kham] CHECK CONSTRAINT [FK_lan_kham_benh]
GO
ALTER TABLE [dbo].[lan_kham]  WITH CHECK ADD  CONSTRAINT [FK_LanKham_SinhHieu] FOREIGN KEY([IdSinhHieu])
REFERENCES [dbo].[SinhHieu] ([Id])
ON DELETE SET NULL
GO
ALTER TABLE [dbo].[lan_kham] CHECK CONSTRAINT [FK_LanKham_SinhHieu]
GO
ALTER TABLE [dbo].[kham_benh_audit_logs]  WITH CHECK ADD  CONSTRAINT [FK_kham_benh_audit_logs_bac_si_chu_so_huu] FOREIGN KEY([id_bac_si_chu_so_huu])
REFERENCES [dbo].[nguoi_dung] ([id])
GO
ALTER TABLE [dbo].[kham_benh_audit_logs] CHECK CONSTRAINT [FK_kham_benh_audit_logs_bac_si_chu_so_huu]
GO
ALTER TABLE [dbo].[kham_benh_audit_logs]  WITH CHECK ADD  CONSTRAINT [FK_kham_benh_audit_logs_benh_nhan] FOREIGN KEY([id_benh_nhan])
REFERENCES [dbo].[benh_nhan] ([id])
GO
ALTER TABLE [dbo].[kham_benh_audit_logs] CHECK CONSTRAINT [FK_kham_benh_audit_logs_benh_nhan]
GO
ALTER TABLE [dbo].[kham_benh_audit_logs]  WITH CHECK ADD  CONSTRAINT [FK_kham_benh_audit_logs_ho_so] FOREIGN KEY([id_ho_so])
REFERENCES [dbo].[ho_so_benh_an] ([id])
GO
ALTER TABLE [dbo].[kham_benh_audit_logs] CHECK CONSTRAINT [FK_kham_benh_audit_logs_ho_so]
GO
ALTER TABLE [dbo].[kham_benh_audit_logs]  WITH CHECK ADD  CONSTRAINT [FK_kham_benh_audit_logs_lan_kham] FOREIGN KEY([id_lan_kham])
REFERENCES [dbo].[lan_kham] ([id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[kham_benh_audit_logs] CHECK CONSTRAINT [FK_kham_benh_audit_logs_lan_kham]
GO
ALTER TABLE [dbo].[kham_benh_audit_logs]  WITH CHECK ADD  CONSTRAINT [FK_kham_benh_audit_logs_nguoi_thuc_hien] FOREIGN KEY([id_nguoi_thuc_hien])
REFERENCES [dbo].[nguoi_dung] ([id])
GO
ALTER TABLE [dbo].[kham_benh_audit_logs] CHECK CONSTRAINT [FK_kham_benh_audit_logs_nguoi_thuc_hien]
GO
ALTER TABLE [dbo].[kham_benh_audit_logs]  WITH CHECK ADD  CONSTRAINT [FK_kham_benh_audit_logs_phong] FOREIGN KEY([id_phong])
REFERENCES [dbo].[phong_kham] ([id])
GO
ALTER TABLE [dbo].[kham_benh_audit_logs] CHECK CONSTRAINT [FK_kham_benh_audit_logs_phong]
GO
ALTER TABLE [dbo].[ho_so_benh_an]  WITH NOCHECK ADD FOREIGN KEY([id_benh_nhan])
REFERENCES [dbo].[benh_nhan] ([id])
GO
ALTER TABLE [dbo].[ho_so_benh_an]  WITH NOCHECK ADD FOREIGN KEY([id_nguoi_tao])
REFERENCES [dbo].[nguoi_dung] ([id])
GO
ALTER TABLE [dbo].[ho_so_benh_an]  WITH CHECK ADD  CONSTRAINT [FK_ho_so_benh_an_khu_tiep_don] FOREIGN KEY([id_khu_tiep_don])
REFERENCES [dbo].[khu_tiep_don] ([id])
GO
ALTER TABLE [dbo].[ho_so_benh_an] CHECK CONSTRAINT [FK_ho_so_benh_an_khu_tiep_don]
GO
ALTER TABLE [dbo].[ho_so_benh_an]  WITH CHECK ADD  CONSTRAINT [FK_ho_so_benh_an_quay_tiep_don] FOREIGN KEY([id_quay_tiep_don])
REFERENCES [dbo].[quay_tiep_don] ([id])
GO
ALTER TABLE [dbo].[ho_so_benh_an] CHECK CONSTRAINT [FK_ho_so_benh_an_quay_tiep_don]
GO
ALTER TABLE [dbo].[vai_tro_quyen]  WITH CHECK ADD FOREIGN KEY([id_quyen])
REFERENCES [dbo].[quyen] ([id])
GO
ALTER TABLE [dbo].[vai_tro_quyen]  WITH CHECK ADD FOREIGN KEY([id_vai_tro])
REFERENCES [dbo].[vai_tro] ([id])
GO
ALTER TABLE [dbo].[tuong_tac_thuoc]  WITH CHECK ADD FOREIGN KEY([id_thuoc_1])
REFERENCES [dbo].[thuoc] ([id])
GO
ALTER TABLE [dbo].[tuong_tac_thuoc]  WITH CHECK ADD FOREIGN KEY([id_thuoc_2])
REFERENCES [dbo].[thuoc] ([id])
GO
ALTER TABLE [dbo].[tiepdon_trangthai_logs]  WITH CHECK ADD  CONSTRAINT [FK_tiepdon_trangthai_logs_ho_so] FOREIGN KEY([id_ho_so])
REFERENCES [dbo].[ho_so_benh_an] ([id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[tiepdon_trangthai_logs] CHECK CONSTRAINT [FK_tiepdon_trangthai_logs_ho_so]
GO
ALTER TABLE [dbo].[tiepdon_trangthai_logs]  WITH CHECK ADD  CONSTRAINT [FK_tiepdon_trangthai_logs_nguoi_dung] FOREIGN KEY([id_nguoi_dung])
REFERENCES [dbo].[nguoi_dung] ([id])
GO
ALTER TABLE [dbo].[tiepdon_trangthai_logs] CHECK CONSTRAINT [FK_tiepdon_trangthai_logs_nguoi_dung]
GO
ALTER TABLE [dbo].[dich_vu_gia]  WITH CHECK ADD FOREIGN KEY([id_dich_vu])
REFERENCES [dbo].[dich_vu] ([id])
GO
ALTER TABLE [dbo].[dich_vu_gia]  WITH CHECK ADD FOREIGN KEY([id_phong])
REFERENCES [dbo].[phong_kham] ([id])
GO
ALTER TABLE [dbo].[bo_chi_dinh_ct]  WITH CHECK ADD FOREIGN KEY([id_bo])
REFERENCES [dbo].[bo_chi_dinh] ([id])
GO
ALTER TABLE [dbo].[bo_chi_dinh_ct]  WITH CHECK ADD FOREIGN KEY([id_dich_vu])
REFERENCES [dbo].[dich_vu] ([id])
GO
