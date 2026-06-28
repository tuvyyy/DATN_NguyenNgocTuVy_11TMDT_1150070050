using System;
using System.Collections.Generic;

namespace ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Models;

public partial class ChongChiDinhBenhThuoc
{
    public long Id { get; set; }

    public long IdBenh { get; set; }

    public long IdThuoc { get; set; }

    public string? CanhBao { get; set; }

    public string? GhiChu { get; set; }

    public virtual Benh IdBenhNavigation { get; set; } = null!;

    public virtual Thuoc IdThuocNavigation { get; set; } = null!;
}
