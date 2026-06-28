using System;
using System.Collections.Generic;

namespace ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Models;

public partial class DvktPhong
{
    public int Id { get; set; }

    public int? IdDvkt { get; set; }

    public int? IdPhong { get; set; }

    public virtual Dvkt? IdDvktNavigation { get; set; }

    public virtual PhongThucHien? IdPhongNavigation { get; set; }
}
