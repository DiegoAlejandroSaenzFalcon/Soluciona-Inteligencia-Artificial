@echo off
:: ============================================================
:: SCRIPT DE PRODUCCION - WhatsApp Lite
:: ============================================================
:: Uso: Double-click or run: node production.js

echo.
echo ========================================
echo  PRODUCCION - WhatsApp Lite
echo ========================================
echo.

:: Verificar Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js no está instalado
    echo Descarga desde: https://nodejs.org
    pause
    exit /b 1
)

:: Crear carpeta de datos si no existe
if not exist "data" mkdir data

:: Verificar si existe trial anterior
if exist "data\trial_license.json" (
    echo [INFO] Trial existente detectado
    for /f "tokens=*" %%i in ('type data\trial_license.json') do set trialData=%%i
    echo [INFO] Trial encontrado - continuando
) else (
    echo [INFO] Creando nuevo trial de 10 dias...
    echo {"trial_start":"%date% %time%","trial_days":10,"features":{"whatsapp":true,"orders":true,"inventory":true,"accounting":true,"full_panel":true}} > data\trial_license.json
)

:: Configurar modo produccion
set NODE_ENV=production
set DEBUG=false
set PERSONAL_MODE=respond

echo.
echo [INFO] Iniciando sistema de produccion...
echo [INFO] Patente: http://localhost:8080
echo [INFO] Presiona Ctrl+C para detener
echo.

:: Iniciar servidor principal
node index.js

echo.
echo [INFO] Sistema detenido