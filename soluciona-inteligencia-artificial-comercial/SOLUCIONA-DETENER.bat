@echo off
title SOLUCIONA INTELIGENCIA ARTIFICIAL - Detener Servicio
cd /d "%~dp0"

echo ============================================================
echo   SOLUCIONA INTELIGENCIA ARTIFICIAL - Detener Servicio
echo ============================================================
echo.

:: Cerrar procesos Node en el puerto 3000
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo [OK] Cerrando proceso en puerto 3000 (PID %%p)
    taskkill /PID %%p /F >nul 2>&1
)

:: Cerrar lock de WhatsApp si existe
if exist "data\whatsapp.lock" (
    del /q "data\whatsapp.lock"
    echo [OK] Lock de WhatsApp eliminado
)

echo.
echo [INFO] Servicio detenido correctamente.
echo.
echo Presiona cualquier tecla para cerrar...
pause >nul