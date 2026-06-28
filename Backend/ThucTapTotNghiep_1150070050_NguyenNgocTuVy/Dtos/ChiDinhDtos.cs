namespace ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Dtos;

public class ClinicWithPriceDto
{
    public int IdPhong { get; set; }
    public string TenPhong { get; set; } = default!;
    public int? IdKhuTiepDon { get; set; }
    public string? MaKhuTiepDon { get; set; }
    public string? TenKhuTiepDon { get; set; }
    public int? IdKhuHoSo { get; set; }
    public bool KhuHopLe { get; set; } = true;
    public bool CanSelect { get; set; } = true;
    public string? LyDoKhongChon { get; set; }
    public string TrangThaiPhong { get; set; } = "DANG_MO";
    public int SoChoDangCho { get; set; }

    public long IdDichVu { get; set; }
    public string MaDichVu { get; set; } = default!;
    public string TenDichVu { get; set; } = default!;
    public string NhomDichVu { get; set; } = "Khám phòng";
    public decimal DonGia { get; set; }
}

public class ServiceCatalogQueryDto
{
    public long? EncounterId { get; set; }
    public int? IdKhuTiepDon { get; set; }
}

// Legacy request (kept for backward compatibility)
public class ChiDinhKhamRequest
{
    public long IdBenhNhan { get; set; }
    public long IdHoSo { get; set; }
    public long IdThuNgan { get; set; }
    public long? IdBacSi { get; set; }
    public List<int> IdPhongChon { get; set; } = new();
    public string? GhiChu { get; set; }
}

public class ChiDinhKhamResponse
{
    public long IdHoaDon { get; set; }
    public string MaHoaDon { get; set; } = default!;
    public decimal TongTien { get; set; }
    public List<ChiTietPhongKhamItem> ChiTiet { get; set; } = new();
}

public class ChiTietPhongKhamItem
{
    public int IdPhong { get; set; }
    public string TenPhong { get; set; } = default!;
    public string TenDichVu { get; set; } = default!;
    public decimal DonGia { get; set; }
    public long IdLanKham { get; set; }
}

public class ServiceOrderRequestDto
{
    public long EncounterId { get; set; }
    public long PatientId { get; set; }
    public string? Note { get; set; }
    public string? DiscountNote { get; set; }
    public bool? ForceRequirePayment { get; set; }
    public string? Mode { get; set; }
    public bool? AllowQueueBeforePayment { get; set; }
    public string? IdempotencyKey { get; set; }
    public List<long> ServiceIds { get; set; } = new();
}

public class ChangeQueueRoomRequestDto
{
    public long EncounterId { get; set; }
    public long VisitId { get; set; }
    public int NewRoomId { get; set; }
    public string? Reason { get; set; }
}

public class ServiceOrderActionResultDto
{
    public long OrderId { get; set; }
    public string OrderCode { get; set; } = default!;
    public string EncounterStatus { get; set; } = default!;
    public decimal TemporaryTotal { get; set; }
    public int ServiceCount { get; set; }
    public bool RequirePaymentBeforeQueue { get; set; }
    public bool QueueCreated { get; set; }
    public string Mode { get; set; } = "MULTI_SERVICE";
    public List<ServiceOrderLineResultDto> Lines { get; set; } = new();
}

public class ServiceOrderLineResultDto
{
    public long ServiceId { get; set; }
    public string ServiceCode { get; set; } = default!;
    public string ServiceName { get; set; } = default!;
    public int RoomId { get; set; }
    public string RoomName { get; set; } = default!;
    public int? RoomAreaId { get; set; }
    public string? RoomAreaCode { get; set; }
    public string? RoomAreaName { get; set; }
    public decimal UnitPrice { get; set; }
    public string Status { get; set; } = "CONFIRMED";
}
