using System;

namespace ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Models;

public partial class GiayHenKhamLai
{
    public long Id { get; set; }

    public long IdLanKham { get; set; }

    public long? IdBenhNhan { get; set; }

    public long? IdBacSi { get; set; }

    public string? HinhThucDieuTri { get; set; }

    public string? KetQua { get; set; }

    public string? LyDoHen { get; set; }

    public string? BenhKemTheo { get; set; }

    public string? LoiDan { get; set; }

    public DateTime NgayHen { get; set; }

    public string? PhongHen { get; set; }

    public string? GhiChu { get; set; }

    public bool DaKy { get; set; }

    public string? BacSiKy { get; set; }

    public DateTime? SignedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual LanKham IdLanKhamNavigation { get; set; } = null!;

    public virtual BenhNhan? IdBenhNhanNavigation { get; set; }

    public virtual NguoiDung? IdBacSiNavigation { get; set; }
}
