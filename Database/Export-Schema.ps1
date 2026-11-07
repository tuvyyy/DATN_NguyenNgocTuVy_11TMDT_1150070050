param(
    [string]$Server = '.\SQLEXPRESS',
    [string]$Database = 'DACN',
    [string]$OutputFile = (Join-Path $PSScriptRoot '01_Schema.sql')
)

$ErrorActionPreference = 'Stop'
$originalDirectory = (Get-Location).Path
try { Import-Module SQLPS -DisableNameChecking -ErrorAction Stop }
finally { Set-Location -LiteralPath $originalDirectory }

$connection = New-Object Microsoft.SqlServer.Management.Smo.Server($Server)
$connection.ConnectionContext.LoginSecure = $true
if ($connection.ConnectionContext.PSObject.Properties['TrustServerCertificate']) {
    $connection.ConnectionContext.TrustServerCertificate = $true
}
try {
    $db = $connection.Databases[$Database]
    if ($null -eq $db) { throw 'Database not found.' }
    # This project currently contains tables and constraints only. Stop rather than silently omit other object types.
    $unsupported = $db.ExecuteWithResults("SELECT COUNT(*) FROM sys.objects WHERE is_ms_shipped=0 AND type IN ('V','P','FN','IF','TF','TR','SO','SN');").Tables[0].Rows[0][0]
    if ($unsupported -gt 0 -or $db.UserDefinedDataTypes.Count -gt 0 -or $db.UserDefinedTableTypes.Count -gt 0) {
        throw 'Additional programmable objects or custom types exist. Extend this exporter before generating a full schema.'
    }
    $scripter = New-Object Microsoft.SqlServer.Management.Smo.Scripter($connection)
    $scripter.Options.ScriptSchema = $true
    $scripter.Options.ScriptData = $false
    $scripter.Options.WithDependencies = $true
    $scripter.Options.DriAll = $true
    $scripter.Options.Indexes = $true
    $scripter.Options.Triggers = $false
    $scripter.Options.IncludeDatabaseContext = $false
    $scripter.Options.SchemaQualify = $true
    $scripter.Options.NoFileGroup = $true
    $scripter.Options.IncludeHeaders = $false
    $scripter.Options.ScriptOwner = $false
    $scripter.Options.Permissions = $false
    $tables = @($db.Tables | Where-Object { -not $_.IsSystemObject })
    [Microsoft.SqlServer.Management.Sdk.Sfc.Urn[]]$urns = @($tables | ForEach-Object { $_.Urn })
    $batches = $scripter.Script($urns)
    $header = @'
-- Full table schema exported from DACN. Contains no patient data, accounts, passwords or server paths.
-- Run ONLY against a newly created EMPTY database. Never use this as an incremental update.
-- SSMS: select the target database before executing. SQLCMD: use -d <database> -b -f 65001.
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;
GO
'@
    $text = $header + "`r`n" + ($batches -join "`r`nGO`r`n") + "`r`nGO`r`n"
    $text = [regex]::Replace($text, '(?m)[ \t]+(?=\r?$)', '')
    [System.IO.File]::WriteAllText([System.IO.Path]::GetFullPath($OutputFile), $text, [System.Text.UTF8Encoding]::new($true))
    Write-Output "Exported $($tables.Count) tables with constraints and indexes to $OutputFile"
} finally { $connection.ConnectionContext.Disconnect() }
