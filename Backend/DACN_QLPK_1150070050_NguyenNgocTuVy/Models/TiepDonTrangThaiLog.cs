using System;

namespace DACN_QLPK_1150070050_NguyenNgocTuVy.Models;

public partial class TiepDonTrangThaiLog
{
    public long Id { get; set; }

    public long IdHoSo { get; set; }

    public string? FromTrangThai { get; set; }

    public string ToTrangThai { get; set; } = null!;

    public string Action { get; set; } = null!;

    public string? Note { get; set; }

    public long? IdNguoiDung { get; set; }

    public DateTime CreatedAt { get; set; }

    public string? Metadata { get; set; }

    public virtual HoSoBenhAn IdHoSoNavigation { get; set; } = null!;

    public virtual NguoiDung? IdNguoiDungNavigation { get; set; }
}
