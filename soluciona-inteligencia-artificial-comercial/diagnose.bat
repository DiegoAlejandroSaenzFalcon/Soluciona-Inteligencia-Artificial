@echo off
title WhatsApp Lite - Diagnóstico Express
cd /d "%~dp0"

echo ============================================================
echo  DIAGNÓSTICO RAPIDO - WhatsApp Lite
echo ============================================================
echo.

echo [1] Verificando Node.js...
where node >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] Node.js instalado
    node --version
) else (
    echo [ERROR] Node.js no está en PATH
    pause
    exit
)

echo.
echo [2] Verificando estructura de archivos...
if exist "core\modules\index.js" echo [OK] core\modules\index.js
if exist "core\classifier\index.js" echo [OK] core\classifier\index.js
if exist "core\modules\message-system.js" echo [OK] core\modules\message-system.js
if exist "core\modules\license\index.js" echo [OK] core\modules\license\index.js
if exist "config.json" echo [OK] config.json
if exist "package.json" echo [OK] package.json

echo.
echo [3] Verificando module.exports...
echo.

echo [4] Probando carga de modulo principal...
node -e "try { const m = require('./core/modules'); console.log('[OK] Modulo cargado'); console.log('[OK] Trial activo:', m.isTrialActive()); } catch(e) { console.log('[ERROR]', e.message); }"

echo.
echo [5] Verificando auth_info...
if exist "auth_info" echo [OK] auth_info existe
if exist "auth_info\session.json" echo [OK] session.json

echo.
echo ============================================================
echo  DIAGNÓSTICO FINAL
echo ============================================================
echo.
echo Si ves errores arriba, revisa los mensajes.
echo.
echo Presiona cualquier tecla para continuar con el arranque...
pause >nul

echo.
echo [INFO] Iniciando sistema completo...
npm start