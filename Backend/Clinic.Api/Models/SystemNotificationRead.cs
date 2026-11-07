namespace Clinic.Api.Models;

public class SystemNotificationRead
{
    public long NotificationId { get; set; }
    public long UserId { get; set; }
    public DateTime ReadAt { get; set; }
}
