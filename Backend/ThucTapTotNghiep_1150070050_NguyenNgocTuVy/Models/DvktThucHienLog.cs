using System;
using System.Collections.Generic;

namespace ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Models;

public partial class DvktThucHienLog
{
    public long Id { get; set; }

    public long IdChiDinhDvkt { get; set; }

    public long IdNguoiThucHien { get; set; }

    public string Action { get; set; } = null!;

    public string? Note { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual ChiDinhDvkt IdChiDinhDvktNavigation { get; set; } = null!;
}
