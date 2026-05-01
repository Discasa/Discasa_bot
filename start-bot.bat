@echo off
setlocal EnableExtensions

set "BOT_DIR=%~dp0"
if "%BOT_DIR:~-1%"=="\" set "BOT_DIR=%BOT_DIR:~0,-1%"

if not exist "%BOT_DIR%\package.json" (
  echo Discasa bot package not found: "%BOT_DIR%\package.json"
  exit /b 1
)

start "Discasa Bot" cmd /k "cd /d ""%BOT_DIR%"" && npm run dev"

endlocal
