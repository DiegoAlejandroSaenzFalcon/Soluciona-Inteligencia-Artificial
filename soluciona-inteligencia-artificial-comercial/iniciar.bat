@echo off
title SOLUCIONA INTELIGENCIA ARTIFICIAL - Sistema de Pedidos
cd /d "%~dp0"

echo ============================================================
echo   SOLUCIONA INTELIGENCIA ARTIFICIAL - Sistema de Pedidos
echo ============================================================
echo.

:: 1. Limpiar lock huerfano (si el proceso anterior murio)
if exist "data\whatsapp.lock" (
    del /q "data\whatsapp.lock"
    echo [OK] Lock huerfano eliminado
)

:: 2. Cerrar procesos que ocupen el puerto 3000 (solo si quedaron colgados)
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo [OK] Cerrando proceso anterior en puerto 3000 (PID %%p)
    taskkill /PID %%p /F >nul 2>&1
)

echo.
echo [INFO] Verificando Node.js...
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js no esta instalado o no esta en PATH.
    echo Descarga desde: https://nodejs.org
    timeout /t 10 >nul
    goto :final
)

echo [INFO] Iniciando el sistema...
echo [INFO] Panel: http://localhost:3000
echo [INFO] Para detener: cierra esta ventana o presiona Ctrl+C
echo.
echo ============================================================
node index.js
echo ============================================================
echo.
echo [INFO] El sistema se detuvo. Revisa los mensajes arriba.

:final
echo.
echo Presiona cualquier tecla para cerrar esta ventana...
pause >nul
