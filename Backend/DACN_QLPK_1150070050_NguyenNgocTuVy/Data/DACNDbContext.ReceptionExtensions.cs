using DACN_QLPK_1150070050_NguyenNgocTuVy.Models;
using Microsoft.EntityFrameworkCore;

namespace DACN_QLPK_1150070050_NguyenNgocTuVy.Data;

public partial class DACNDbContext
{
    public virtual DbSet<KhuTiepDon> KhuTiepDons { get; set; }

    public virtual DbSet<QuayTiepDon> QuayTiepDons { get; set; }

    public virtual DbSet<NguoiDungKhu> NguoiDungKhus { get; set; }

    public virtual DbSet<TiepDonTrangThaiLog> TiepDonTrangThaiLogs { get; set; }

    public virtual DbSet<GiayHenKhamLai> GiayHenKhamLais { get; set; }

    public virtual DbSet<GiayKetLuanKham> GiayKetLuanKhams { get; set; }

    public virtual DbSet<LanKhamBenhKemTheo> LanKhamBenhKemTheos { get; set; }

    public virtual DbSet<KhamBenhAuditLog> KhamBenhAuditLogs { get; set; }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder)
    {
        ConfigureReceptionAreas(modelBuilder);
        ConfigureTiepDonTrangThaiLogs(modelBuilder);
        ConfigureGiayHenKhamLai(modelBuilder);
        ConfigureGiayKetLuanKham(modelBuilder);
        ConfigureLanKhamBenhKemTheo(modelBuilder);
        ConfigureKhamBenhAuditLogs(modelBuilder);
        ConfigurePermissionAuditLogs(modelBuilder);
        ConfigureOperationsCenter(modelBuilder);
    }

    private static void ConfigureReceptionAreas(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<KhuTiepDon>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK_khu_tiep_don");
            entity.ToTable("khu_tiep_don");

            entity.HasIndex(e => e.MaKhu, "UX_khu_tiep_don_ma").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.MaKhu)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("ma_khu");
            entity.Property(e => e.TenKhu)
                .HasMaxLength(150)
                .HasColumnName("ten_khu");
            entity.Property(e => e.MoTa)
                .HasMaxLength(500)
                .HasColumnName("mo_ta");
            entity.Property(e => e.HoatDong)
                .HasDefaultValue(true)
                .HasColumnName("hoat_dong");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("datetime")
                .HasColumnName("updated_at");
        });

        modelBuilder.Entity<QuayTiepDon>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK_quay_tiep_don");
            entity.ToTable("quay_tiep_don");

            entity.HasIndex(e => new { e.IdKhuTiepDon, e.MaQuay }, "UX_quay_tiep_don_khu_ma").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.IdKhuTiepDon).HasColumnName("id_khu_tiep_don");
            entity.Property(e => e.MaQuay)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("ma_quay");
            entity.Property(e => e.TenQuay)
                .HasMaxLength(150)
                .HasColumnName("ten_quay");
            entity.Property(e => e.ThuTu).HasColumnName("thu_tu");
            entity.Property(e => e.HoatDong)
                .HasDefaultValue(true)
                .HasColumnName("hoat_dong");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("datetime")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.IdKhuTiepDonNavigation)
                .WithMany(p => p.QuayTiepDons)
                .HasForeignKey(d => d.IdKhuTiepDon)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_quay_tiep_don_khu");
        });

        modelBuilder.Entity<NguoiDungKhu>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK_nguoi_dung_khu");
            entity.ToTable("nguoi_dung_khu");

            entity.HasIndex(e => new { e.IdNguoiDung, e.IdKhuTiepDon }, "UX_nguoi_dung_khu_user_khu").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.IdNguoiDung).HasColumnName("id_nguoi_dung");
            entity.Property(e => e.IdKhuTiepDon).HasColumnName("id_khu_tiep_don");
            entity.Property(e => e.LaMacDinh)
                .HasDefaultValue(false)
                .HasColumnName("la_mac_dinh");
            entity.Property(e => e.HoatDong)
                .HasDefaultValue(true)
                .HasColumnName("hoat_dong");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime")
                .HasColumnName("created_at");

            entity.HasOne(d => d.IdNguoiDungNavigation)
                .WithMany(p => p.NguoiDungKhus)
                .HasForeignKey(d => d.IdNguoiDung)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_nguoi_dung_khu_user");

            entity.HasOne(d => d.IdKhuTiepDonNavigation)
                .WithMany(p => p.NguoiDungKhus)
                .HasForeignKey(d => d.IdKhuTiepDon)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_nguoi_dung_khu_khu");
        });

        modelBuilder.Entity<HoSoBenhAn>(entity =>
        {
            entity.Property(e => e.IdKhuTiepDon).HasColumnName("id_khu_tiep_don");
            entity.Property(e => e.IdQuayTiepDon).HasColumnName("id_quay_tiep_don");

            entity.HasOne(d => d.IdKhuTiepDonNavigation)
                .WithMany(p => p.HoSoBenhAns)
                .HasForeignKey(d => d.IdKhuTiepDon)
                .HasConstraintName("FK_ho_so_benh_an_khu_tiep_don");

            entity.HasOne(d => d.IdQuayTiepDonNavigation)
                .WithMany(p => p.HoSoBenhAns)
                .HasForeignKey(d => d.IdQuayTiepDon)
                .HasConstraintName("FK_ho_so_benh_an_quay_tiep_don");
        });

        modelBuilder.Entity<PhongKham>(entity =>
        {
            entity.Property(e => e.IdKhuTiepDon).HasColumnName("id_khu_tiep_don");

            entity.HasOne(d => d.IdKhuTiepDonNavigation)
                .WithMany(p => p.PhongKhams)
                .HasForeignKey(d => d.IdKhuTiepDon)
                .HasConstraintName("FK_phong_kham_khu_tiep_don");
        });

        modelBuilder.Entity<PhongThucHien>(entity =>
        {
            entity.Property(e => e.IdKhuTiepDon).HasColumnName("id_khu_tiep_don");

            entity.HasOne(d => d.IdKhuTiepDonNavigation)
                .WithMany(p => p.PhongThucHiens)
                .HasForeignKey(d => d.IdKhuTiepDon)
                .HasConstraintName("FK_phong_thuc_hien_khu_tiep_don");
        });
    }

    private static void ConfigureTiepDonTrangThaiLogs(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<TiepDonTrangThaiLog>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK_tiepdon_trangthai_logs");

            entity.ToTable("tiepdon_trangthai_logs");

            entity.HasIndex(e => new { e.IdHoSo, e.CreatedAt }, "IX_tiepdon_trangthai_logs_hoso_time");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Action)
                .HasMaxLength(80)
                .IsUnicode(false)
                .HasColumnName("action");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.FromTrangThai)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("from_trang_thai");
            entity.Property(e => e.IdHoSo).HasColumnName("id_ho_so");
            entity.Property(e => e.IdNguoiDung).HasColumnName("id_nguoi_dung");
            entity.Property(e => e.Metadata).HasColumnName("metadata");
            entity.Property(e => e.Note)
                .HasMaxLength(500)
                .HasColumnName("note");
            entity.Property(e => e.ToTrangThai)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("to_trang_thai");

            entity.HasOne(d => d.IdHoSoNavigation)
                .WithMany()
                .HasForeignKey(d => d.IdHoSo)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_tiepdon_trangthai_logs_ho_so");

            entity.HasOne(d => d.IdNguoiDungNavigation)
                .WithMany()
                .HasForeignKey(d => d.IdNguoiDung)
                .HasConstraintName("FK_tiepdon_trangthai_logs_nguoi_dung");
        });
    }

    private static void ConfigureGiayHenKhamLai(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<LanKham>(entity =>
        {
            entity.Property(e => e.BenhKemTheo)
                .HasMaxLength(500)
                .HasColumnName("benh_kem_theo");
        });

        modelBuilder.Entity<GiayHenKhamLai>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK_giay_hen_kham_lai");
            entity.ToTable("giay_hen_kham_lai");

            entity.HasIndex(e => new { e.IdLanKham, e.CreatedAt }, "IX_giay_hen_kham_lai_lankham_time");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.IdLanKham).HasColumnName("id_lan_kham");
            entity.Property(e => e.IdBenhNhan).HasColumnName("id_benh_nhan");
            entity.Property(e => e.IdBacSi).HasColumnName("id_bac_si");
            entity.Property(e => e.HinhThucDieuTri).HasMaxLength(120).HasColumnName("hinh_thuc_dieu_tri");
            entity.Property(e => e.KetQua).HasMaxLength(120).HasColumnName("ket_qua");
            entity.Property(e => e.LyDoHen).HasMaxLength(1000).HasColumnName("ly_do_hen");
            entity.Property(e => e.BenhKemTheo).HasMaxLength(500).HasColumnName("benh_kem_theo");
            entity.Property(e => e.LoiDan).HasMaxLength(1000).HasColumnName("loi_dan");
            entity.Property(e => e.NgayHen).HasColumnType("datetime").HasColumnName("ngay_hen");
            entity.Property(e => e.PhongHen).HasMaxLength(150).HasColumnName("phong_hen");
            entity.Property(e => e.GhiChu).HasMaxLength(1000).HasColumnName("ghi_chu");
            entity.Property(e => e.DaKy).HasColumnName("da_ky");
            entity.Property(e => e.BacSiKy).HasMaxLength(150).HasColumnName("bac_si_ky");
            entity.Property(e => e.SignedAt).HasColumnType("datetime").HasColumnName("signed_at");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime").HasColumnName("updated_at");

            entity.HasOne(d => d.IdLanKhamNavigation)
                .WithMany()
                .HasForeignKey(d => d.IdLanKham)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_giay_hen_kham_lai_lan_kham");

            entity.HasOne(d => d.IdBenhNhanNavigation)
                .WithMany()
                .HasForeignKey(d => d.IdBenhNhan)
                .HasConstraintName("FK_giay_hen_kham_lai_benh_nhan");

            entity.HasOne(d => d.IdBacSiNavigation)
                .WithMany()
                .HasForeignKey(d => d.IdBacSi)
                .HasConstraintName("FK_giay_hen_kham_lai_bac_si");
        });
    }

    private static void ConfigureLanKhamBenhKemTheo(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<LanKhamBenhKemTheo>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK_lan_kham_benh_kem_theo");
            entity.ToTable("lan_kham_benh_kem_theo");

            entity.HasIndex(e => new { e.IdLanKham, e.IdBenh }, "UX_lan_kham_benh_kem_theo").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.IdLanKham).HasColumnName("id_lan_kham");
            entity.Property(e => e.IdBenh).HasColumnName("id_benh");
            entity.Property(e => e.ThuTu).HasColumnName("thu_tu");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime")
                .HasColumnName("created_at");

            entity.HasOne(d => d.IdLanKhamNavigation)
                .WithMany(p => p.LanKhamBenhKemTheos)
                .HasForeignKey(d => d.IdLanKham)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_lan_kham_benh_kem_theo_lan_kham");

            entity.HasOne(d => d.IdBenhNavigation)
                .WithMany(p => p.LanKhamBenhKemTheos)
                .HasForeignKey(d => d.IdBenh)
                .HasConstraintName("FK_lan_kham_benh_kem_theo_benh");
        });
    }

    private static void ConfigureGiayKetLuanKham(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<GiayKetLuanKham>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK_giay_ket_luan_kham");
            entity.ToTable("giay_ket_luan_kham");

            entity.HasIndex(e => new { e.IdLanKham, e.LoaiGiay, e.CreatedAt }, "IX_giay_ket_luan_kham_lankham_type_time");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.IdLanKham).HasColumnName("id_lan_kham");
            entity.Property(e => e.IdBenhNhan).HasColumnName("id_benh_nhan");
            entity.Property(e => e.IdBacSi).HasColumnName("id_bac_si");
            entity.Property(e => e.LoaiGiay).HasMaxLength(40).IsUnicode(false).HasColumnName("loai_giay");
            entity.Property(e => e.HinhThucDieuTri).HasMaxLength(120).HasColumnName("hinh_thuc_dieu_tri");
            entity.Property(e => e.KetQua).HasMaxLength(120).HasColumnName("ket_qua");
            entity.Property(e => e.ChanDoan).HasMaxLength(1000).HasColumnName("chan_doan");
            entity.Property(e => e.BenhKemTheo).HasMaxLength(1000).HasColumnName("benh_kem_theo");
            entity.Property(e => e.LyDoHen).HasMaxLength(1000).HasColumnName("ly_do_hen");
            entity.Property(e => e.LoiDan).HasMaxLength(1000).HasColumnName("loi_dan");
            entity.Property(e => e.NgayHen).HasColumnType("datetime").HasColumnName("ngay_hen");
            entity.Property(e => e.PhongHen).HasMaxLength(150).HasColumnName("phong_hen");
            entity.Property(e => e.LyDoVaoVien).HasMaxLength(1000).HasColumnName("ly_do_vao_vien");
            entity.Property(e => e.KhoaNhapVien).HasMaxLength(200).HasColumnName("khoa_nhap_vien");
            entity.Property(e => e.KinhGui).HasMaxLength(300).HasColumnName("kinh_gui");
            entity.Property(e => e.DauHieuLamSang).HasMaxLength(1500).HasColumnName("dau_hieu_lam_sang");
            entity.Property(e => e.LyDoChuyenTuyen).HasMaxLength(500).HasColumnName("ly_do_chuyen_tuyen");
            entity.Property(e => e.HuongDieuTriChuyenTuyen).HasMaxLength(1000).HasColumnName("huong_dieu_tri_chuyen_tuyen");
            entity.Property(e => e.PhuongTienVanChuyen).HasMaxLength(300).HasColumnName("phuong_tien_van_chuyen");
            entity.Property(e => e.LyDoKhongKham).HasMaxLength(1000).HasColumnName("ly_do_khong_kham");
            entity.Property(e => e.GhiChu).HasMaxLength(1000).HasColumnName("ghi_chu");
            entity.Property(e => e.DaKy).HasColumnName("da_ky");
            entity.Property(e => e.BacSiKy).HasMaxLength(150).HasColumnName("bac_si_ky");
            entity.Property(e => e.SignedAt).HasColumnType("datetime").HasColumnName("signed_at");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime").HasColumnName("updated_at");

            entity.HasOne(d => d.IdLanKhamNavigation)
                .WithMany()
                .HasForeignKey(d => d.IdLanKham)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_giay_ket_luan_kham_lan_kham");

            entity.HasOne(d => d.IdBenhNhanNavigation)
                .WithMany()
                .HasForeignKey(d => d.IdBenhNhan)
                .HasConstraintName("FK_giay_ket_luan_kham_benh_nhan");

            entity.HasOne(d => d.IdBacSiNavigation)
                .WithMany()
                .HasForeignKey(d => d.IdBacSi)
                .HasConstraintName("FK_giay_ket_luan_kham_bac_si");
        });
    }

    private static void ConfigureKhamBenhAuditLogs(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<KhamBenhAuditLog>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK_kham_benh_audit_logs");
            entity.ToTable("kham_benh_audit_logs");

            entity.HasIndex(e => new { e.IdLanKham, e.CreatedAt }, "IX_kham_benh_audit_logs_lankham_time");
            entity.HasIndex(e => new { e.IdHoSo, e.CreatedAt }, "IX_kham_benh_audit_logs_hoso_time");
            entity.HasIndex(e => new { e.IdNguoiThucHien, e.CreatedAt }, "IX_kham_benh_audit_logs_actor_time");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.IdLanKham).HasColumnName("id_lan_kham");
            entity.Property(e => e.IdHoSo).HasColumnName("id_ho_so");
            entity.Property(e => e.IdBenhNhan).HasColumnName("id_benh_nhan");
            entity.Property(e => e.IdPhong).HasColumnName("id_phong");
            entity.Property(e => e.IdBacSiChuSoHuu).HasColumnName("id_bac_si_chu_so_huu");
            entity.Property(e => e.IdNguoiThucHien).HasColumnName("id_nguoi_thuc_hien");
            entity.Property(e => e.TenNguoiThucHien).HasMaxLength(150).HasColumnName("ten_nguoi_thuc_hien");
            entity.Property(e => e.HanhDong).HasMaxLength(80).IsUnicode(false).HasColumnName("hanh_dong");
            entity.Property(e => e.DoiTuong).HasMaxLength(50).IsUnicode(false).HasColumnName("doi_tuong");
            entity.Property(e => e.IdDoiTuong).HasColumnName("id_doi_tuong");
            entity.Property(e => e.LyDo).HasMaxLength(500).HasColumnName("ly_do");
            entity.Property(e => e.DuLieuTruoc).HasColumnName("du_lieu_truoc");
            entity.Property(e => e.DuLieuSau).HasColumnName("du_lieu_sau");
            entity.Property(e => e.IpAddress).HasMaxLength(60).IsUnicode(false).HasColumnName("ip_address");
            entity.Property(e => e.UserAgent).HasMaxLength(300).HasColumnName("user_agent");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime")
                .HasColumnName("created_at");

            entity.HasOne(d => d.IdLanKhamNavigation)
                .WithMany()
                .HasForeignKey(d => d.IdLanKham)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_kham_benh_audit_logs_lan_kham");

            entity.HasOne(d => d.IdHoSoNavigation)
                .WithMany()
                .HasForeignKey(d => d.IdHoSo)
                .HasConstraintName("FK_kham_benh_audit_logs_ho_so");

            entity.HasOne(d => d.IdBenhNhanNavigation)
                .WithMany()
                .HasForeignKey(d => d.IdBenhNhan)
                .HasConstraintName("FK_kham_benh_audit_logs_benh_nhan");

            entity.HasOne(d => d.IdPhongNavigation)
                .WithMany()
                .HasForeignKey(d => d.IdPhong)
                .HasConstraintName("FK_kham_benh_audit_logs_phong");

            entity.HasOne(d => d.IdBacSiChuSoHuuNavigation)
                .WithMany()
                .HasForeignKey(d => d.IdBacSiChuSoHuu)
                .HasConstraintName("FK_kham_benh_audit_logs_bac_si_chu_so_huu");

            entity.HasOne(d => d.IdNguoiThucHienNavigation)
                .WithMany()
                .HasForeignKey(d => d.IdNguoiThucHien)
                .HasConstraintName("FK_kham_benh_audit_logs_nguoi_thuc_hien");
        });
    }
}
