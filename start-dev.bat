@echo off
setlocal
cd /d "%~dp0"

if not exist node_modules (
  echo [QR Voxel Studio] Instalando dependencias...
  call npm install
  if errorlevel 1 goto :error
)

echo [QR Voxel Studio] Iniciando en https://
call npm run dev
goto :eof

:error
echo.
echo Ocurrio un error al preparar el proyecto.
pause
exit /b 1
