$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$sources = @('EDIT-ME-SUPABASE-KEYS.txt', 'ENV-settings.txt')
if (Test-Path 'ENV-settings.txt') { } else {
  $zh = Get-ChildItem -Filter 'ENV*.txt' | Where-Object { $_.Name -ne 'EDIT-ME-SUPABASE-KEYS.txt' } | Select-Object -First 1
  if ($zh) { $sources = @('EDIT-ME-SUPABASE-KEYS.txt', $zh.Name) }
}

$src = $sources | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $src) {
  Write-Host 'ERROR: EDIT-ME-SUPABASE-KEYS.txt not found' -ForegroundColor Red
  exit 1
}

$lines = Get-Content $src -Encoding UTF8 | Where-Object {
  $_ -notmatch '^\s*#' -and $_.Trim() -ne ''
}

$keyLine = $lines | Where-Object { $_ -match '^VITE_SUPABASE_ANON_KEY=' }
if ($keyLine -match '^VITE_SUPABASE_ANON_KEY=\s*$') {
  Write-Host 'WARNING: VITE_SUPABASE_ANON_KEY is empty. Paste sb_publishable_ key and save first.' -ForegroundColor Yellow
}

$envPath = Join-Path $PSScriptRoot '.env'
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllLines($envPath, $lines, $utf8)

Write-Host ''
Write-Host 'OK: wrote .env' -ForegroundColor Green
Write-Host "From: $src"
Write-Host 'Next: restart npm run dev'
Write-Host ''
