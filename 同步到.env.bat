@echo off
chcp 65001 >nul
cd /d "%~dp0"
powershell -NoProfile -Command "$out = Get-Content 'ENV設定.txt' -Encoding UTF8 | Where-Object { $_ -notmatch '^\s*#' -and $_.Trim() -ne '' }; $out | Set-Content '.env' -Encoding UTF8"
if errorlevel 1 (
  echo 同步失敗
  pause
  exit /b 1
)
echo 已成功寫入 .env
echo 若網站已在跑，請重啟 npm run dev
pause
