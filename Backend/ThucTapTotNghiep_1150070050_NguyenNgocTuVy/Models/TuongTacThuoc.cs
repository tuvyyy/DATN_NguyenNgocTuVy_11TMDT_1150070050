using System;
using System.Collections.Generic;

namespace ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Models;

public partial class TuongTacThuoc
{
    public long Id { get; set; }

    public long IdThuoc1 { get; set; }

    public long IdThuoc2 { get; set; }

    public int MucDo { get; set; }

    public string? CanhBao { get; set; }

    public virtual Thuoc IdThuoc1Navigation { get; set; } = null!;

    public virtual Thuoc IdThuoc2Navigation { get; set; } = null!;
}
