param([string]$Server, [string]$Database)

$ErrorActionPreference = 'Stop'
$repositoryPath = Split-Path -Parent $PSScriptRoot
$backendPath = Join-Path $repositoryPath 'Backend/Clinic.Api'
$config = Get-Content (Join-Path $backendPath 'appsettings.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$development = Get-Content (Join-Path $backendPath 'appsettings.Development.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$connectionString = if ($development.ConnectionStrings.DefaultConnection) { $development.ConnectionStrings.DefaultConnection } else { $config.ConnectionStrings.DefaultConnection }
$options = [System.Data.SqlClient.SqlConnectionStringBuilder]::new($connectionString)
if ($Server) { $options['Data Source'] = $Server }
if ($Database) { $options['Initial Catalog'] = $Database }
if (-not $options.InitialCatalog) { throw 'A target database is required.' }

$connection = [System.Data.SqlClient.SqlConnection]::new($options.ConnectionString)
try {
    $connection.Open()
    $command = $connection.CreateCommand()
    $command.CommandTimeout = 180
    $command.CommandText = Get-Content (Join-Path $PSScriptRoot '04_SeedVisitHistory.sql') -Raw -Encoding UTF8
    $summary = [System.Data.DataTable]::new()
    $reader = $command.ExecuteReader()
    try { $summary.Load($reader) } finally { $reader.Dispose() }
    Write-Output ('Demo history prepared in database: ' + $options.InitialCatalog)
    $summary | Format-List
} finally { $connection.Dispose() }
