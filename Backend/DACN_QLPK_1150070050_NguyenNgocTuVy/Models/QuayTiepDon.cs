using System;
using System.Collections.Generic;

namespace DACN_QLPK_1150070050_NguyenNgocTuVy.Models;

public partial class QuayTiepDon
{
    public int Id { get; set; }

    public int IdKhuTiepDon { get; set; }

    public string MaQuay { get; set; } = null!;

    public string TenQuay { get; set; } = null!;

    public int? ThuTu { get; set; }

    public bool? HoatDong { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual KhuTiepDon IdKhuTiepDonNavigation { get; set; } = null!;

    public virtual ICollection<HoSoBenhAn> HoSoBenhAns { get; set; } = new List<HoSoBenhAn>();
}
