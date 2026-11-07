using System;
using System.Collections.Generic;

namespace Clinic.Api.Models;

public partial class NhomThuoc
{
    public int Id { get; set; }

    public string Ten { get; set; } = null!;

    public string? MoTa { get; set; }

    public virtual ICollection<Thuoc> Thuocs { get; set; } = new List<Thuoc>();
}
