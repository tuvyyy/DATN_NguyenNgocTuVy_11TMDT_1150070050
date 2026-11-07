param(
    [string]$Server = '.\SQLEXPRESS',
    [string]$Database = 'DACN',
    [ValidateLength(1, 100)][string]$Username = 'admin',
    [System.Security.SecureString]$Password
)

$ErrorActionPreference = 'Stop'
if ($null -eq $Password) { $Password = Read-Host 'Choose a password for the new admin (at least 8 characters)' -AsSecureString }
if ($Password.Length -lt 8) { throw 'Use at least 8 characters.' }

$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password)
try { $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
$salt = New-Object byte[] 16
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try { $rng.GetBytes($salt) } finally { $rng.Dispose() }
# Same PBKDF2-SHA256 settings as the backend PasswordHasher: 100000 iterations, 32-byte hash.
$hasher = [System.Security.Cryptography.Rfc2898DeriveBytes]::new($plainPassword, $salt, 100000, [System.Security.Cryptography.HashAlgorithmName]::SHA256)
try { $hash = [Convert]::ToBase64String($hasher.GetBytes(32)) }
finally { $hasher.Dispose(); $plainPassword = $null }

$connectionOptions = [System.Data.SqlClient.SqlConnectionStringBuilder]::new()
$connectionOptions['Data Source'] = $Server
$connectionOptions['Initial Catalog'] = $Database
$connectionOptions['Integrated Security'] = $true
$connectionOptions['TrustServerCertificate'] = $true
$connectionOptions['Connect Timeout'] = 10
$connection = [System.Data.SqlClient.SqlConnection]::new($connectionOptions.get_ConnectionString())
try {
    $connection.Open()
    $command = $connection.CreateCommand()
    $command.CommandText = @'
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF NOT EXISTS (SELECT 1 FROM dbo.vai_tro WHERE ten = 'ADMIN')
    THROW 51000, 'Run 02_SeedBase.sql first.', 1;
IF EXISTS (SELECT 1 FROM dbo.nguoi_dung WHERE ten_dang_nhap = @username)
    THROW 51001, 'Username already exists; no account was modified.', 1;
INSERT dbo.nguoi_dung (ten_dang_nhap, mat_khau, salt, ma_nv, ho_ten, hoat_dong, so_lan_sai, so_lan_khoa, created_at)
VALUES (@username, @hash, @salt, CONCAT('SETUP-', LEFT(CONVERT(varchar(36), NEWID()), 20)), N'Quản trị viên', 1, 0, 0, GETUTCDATE());
DECLARE @userId bigint = SCOPE_IDENTITY();
INSERT dbo.nguoi_dung_vai_tro (id_nguoi_dung, id_vai_tro)
SELECT @userId, id FROM dbo.vai_tro WHERE ten = 'ADMIN';
COMMIT TRANSACTION;
'@
    $null = $command.Parameters.Add('@username', [System.Data.SqlDbType]::NVarChar, 100)
    $command.Parameters['@username'].Value = $Username
    $null = $command.Parameters.Add('@hash', [System.Data.SqlDbType]::VarChar, 255)
    $command.Parameters['@hash'].Value = $hash
    $null = $command.Parameters.Add('@salt', [System.Data.SqlDbType]::VarChar, 255)
    $command.Parameters['@salt'].Value = [Convert]::ToBase64String($salt)
    $null = $command.ExecuteNonQuery()
    Write-Output "Created admin '$Username' in '$Database'. No existing account was changed."
} finally { $connection.Dispose() }
