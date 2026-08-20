@echo off
title Reinicio Servidor SOLUCIONA INTELIGENCIA ARTIFICIAL
cd "C:\Users\H2R\Documents\Default Project\soluciona-inteligencia-artificial\soluciona-inteligencia-artificial-comercial"

:START
echo.
echo Matando procesos Node antiguos...
taskkill /F /IM node.exe 2>nul
timeout /t 2 >nul

echo.
echo Verificando dashboard.html...
if exist dashboard.html (
    findstr /I "SOLUCIONA" dashboard.html >nul
    if errorlevel 1 (
        echo ERROR: dashboard.html no tiene el título correcto
        pause
        exit /b 1
    )
    echo dashboard.html: Título correcto "SOLUCIONA INTELIGENCIA ARTIFICIAL"
) else (
    echo ERROR: dashboard.html no encontrado
    pause
    exit /b 1
)

echo.
echo Levanta el server...
node index.js
timeout /t 3 >nul

echo.
echo Probando endpoint...
curl -s http://localhost:3000/api/asistentes >nul
if errorlevel 1 (
    echo Endpoint no respondiendo, revisar logs
) else (
    echo Endpoint respondiendo correctamente
)

echo.
echo ¡Proceso completado!
echo Abra http://localhost:3000 en su navegador y borre caché (Ctrl+Shift+Supr)
pause