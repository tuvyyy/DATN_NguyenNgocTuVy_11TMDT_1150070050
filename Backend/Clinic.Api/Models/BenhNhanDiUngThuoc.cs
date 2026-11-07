using System;
using System.Collections.Generic;

namespace Clinic.Api.Models;

public partial class BenhNhanDiUngThuoc
{
    public long Id { get; set; }

    public long IdBenhNhan { get; set; }

    public long IdThuoc { get; set; }

    public string? GhiChu { get; set; }

    public virtual BenhNhan IdBenhNhanNavigation { get; set; } = null!;

    public virtual Thuoc IdThuocNavigation { get; set; } = null!;
}
