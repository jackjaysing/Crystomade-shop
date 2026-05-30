@echo off
cd /d "%~dp0"
if exist "ENV設定.txt" (
  notepad "ENV設定.txt"
) else if exist ".env" (
  notepad ".env"
) else (
  echo 找不到 ENV設定.txt 或 .env
  pause
)
