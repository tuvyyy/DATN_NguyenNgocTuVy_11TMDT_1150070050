using System;
using System.Collections.Generic;

namespace Clinic.Api.Models;

public partial class NguoiDungVaiTro
{
    public int Id { get; set; }

    public long? IdNguoiDung { get; set; }

    public int? IdVaiTro { get; set; }

    public virtual NguoiDung? IdNguoiDungNavigation { get; set; }

    public virtual VaiTro? IdVaiTroNavigation { get; set; }
}
