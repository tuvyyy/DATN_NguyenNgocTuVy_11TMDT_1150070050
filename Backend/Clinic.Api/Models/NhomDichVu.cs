using System;
using System.Collections.Generic;

namespace Clinic.Api.Models;

public partial class NhomDichVu
{
    public int Id { get; set; }

    public string Ten { get; set; } = null!;

    public string? MoTa { get; set; }

    public virtual ICollection<DichVu> DichVus { get; set; } = new List<DichVu>();
}
