using System;

namespace DACN_QLPK_1150070050_NguyenNgocTuVy.Models;

public partial class NguoiDungKhu
{
    public long Id { get; set; }

    public long IdNguoiDung { get; set; }

    public int IdKhuTiepDon { get; set; }

    public bool? LaMacDinh { get; set; }

    public bool? HoatDong { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual NguoiDung IdNguoiDungNavigation { get; set; } = null!;

    public virtual KhuTiepDon IdKhuTiepDonNavigation { get; set; } = null!;
}
