using System;
using System.Collections.Generic;

namespace ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Models;

public partial class Benh
{
    public long Id { get; set; }

    public string Ma { get; set; } = null!;

    public string Ten { get; set; } = null!;

    public string? MoTa { get; set; }

    public virtual ICollection<ChongChiDinhBenhThuoc> ChongChiDinhBenhThuocs { get; set; } = new List<ChongChiDinhBenhThuoc>();

    public virtual ICollection<LanKham> LanKhams { get; set; } = new List<LanKham>();

    public virtual ICollection<LanKhamBenhKemTheo> LanKhamBenhKemTheos { get; set; } = new List<LanKhamBenhKemTheo>();
}
