using System;

namespace ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Models;

public partial class LanKhamBenhKemTheo
{
    public long Id { get; set; }

    public long IdLanKham { get; set; }

    public long IdBenh { get; set; }

    public int ThuTu { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual LanKham IdLanKhamNavigation { get; set; } = null!;

    public virtual Benh IdBenhNavigation { get; set; } = null!;
}
