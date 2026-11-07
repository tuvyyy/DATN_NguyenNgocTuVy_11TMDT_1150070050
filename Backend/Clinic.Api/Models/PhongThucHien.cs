using System;
using System.Collections.Generic;

namespace Clinic.Api.Models;

public partial class PhongThucHien
{
    public int Id { get; set; }

    public string? TenPhong { get; set; }

    public int? IdKhuTiepDon { get; set; }

    public int? Tang { get; set; }

    public bool? HoatDong { get; set; }

    public virtual KhuTiepDon? IdKhuTiepDonNavigation { get; set; }

    public virtual ICollection<DvktPhong> DvktPhongs { get; set; } = new List<DvktPhong>();
}
