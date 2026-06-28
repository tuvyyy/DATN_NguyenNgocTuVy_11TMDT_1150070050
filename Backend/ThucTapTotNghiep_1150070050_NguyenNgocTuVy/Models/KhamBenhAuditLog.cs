using System;

namespace ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Models;

public partial class KhamBenhAuditLog
{
    public long Id { get; set; }

    public long? IdLanKham { get; set; }

    public long? IdHoSo { get; set; }

    public long? IdBenhNhan { get; set; }

    public int? IdPhong { get; set; }

    public long? IdBacSiChuSoHuu { get; set; }

    public long? IdNguoiThucHien { get; set; }

    public string? TenNguoiThucHien { get; set; }

    public string HanhDong { get; set; } = null!;

    public string? DoiTuong { get; set; }

    public long? IdDoiTuong { get; set; }

    public string? LyDo { get; set; }

    public string? DuLieuTruoc { get; set; }

    public string? DuLieuSau { get; set; }

    public string? IpAddress { get; set; }

    public string? UserAgent { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual LanKham? IdLanKhamNavigation { get; set; }

    public virtual HoSoBenhAn? IdHoSoNavigation { get; set; }

    public virtual BenhNhan? IdBenhNhanNavigation { get; set; }

    public virtual PhongKham? IdPhongNavigation { get; set; }

    public virtual NguoiDung? IdBacSiChuSoHuuNavigation { get; set; }

    public virtual NguoiDung? IdNguoiThucHienNavigation { get; set; }
}
