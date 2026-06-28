using System;
using System.Collections.Generic;

namespace ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Models;

public partial class KhuTiepDon
{
    public int Id { get; set; }

    public string MaKhu { get; set; } = null!;

    public string TenKhu { get; set; } = null!;

    public string? MoTa { get; set; }

    public bool? HoatDong { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<HoSoBenhAn> HoSoBenhAns { get; set; } = new List<HoSoBenhAn>();

    public virtual ICollection<NguoiDungKhu> NguoiDungKhus { get; set; } = new List<NguoiDungKhu>();

    public virtual ICollection<PhongKham> PhongKhams { get; set; } = new List<PhongKham>();

    public virtual ICollection<PhongThucHien> PhongThucHiens { get; set; } = new List<PhongThucHien>();

    public virtual ICollection<QuayTiepDon> QuayTiepDons { get; set; } = new List<QuayTiepDon>();
}
