@echo off
title Reinicio del Servidor SOLUCIONA INTELIGENCIA ARTIFICIAL
cd "C:\Users\H2R\Documents\Default Project\soluciona-inteligencia-artificial\soluciona-inteligencia-artificial-comercial"

:START
echo.
echo Matando procesos Node antiguos...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak > nul

echo.
echo Verificando dashboard.html...
if exist dashboard.html (
    findstr "{{negocio}}" dashboard.html >nul
    if errorlevel 1 (
        echo ERROR: dashboard.html no tiene el título correcto
        pause
        exit /b 1
    )
    echo dashboard.html: Título correcto encontrado
) else (
    echo ERROR: dashboard.html no encontrado
    pause
    exit /b 1
)

echo.
echo Levanta el server...
echo Ejecutando: node index.js
start "NodeServer" node index.js
timeout /t 3 /nobreak > nul

echo.
echo Probando endpoint /api/asistentes...
for /L %i in (1,1,10) do (
    curl -s http://localhost:3000/api/asistentes > response.txt 2>&1
    find "Marketing" response.txt >nul
    if errorlevel 1 (
        echo Intento %i: Sin respuesta aún, esperando...
        timeout /t 1 /nobreak > nul
    ) else (
        echo Intento %i: Respuesta exitosa
        break
    )
)

echo.
echo Mostrando respuesta del endpoint:
type response.txt

echo.
echo ¡Proceso completado!
echo Abra http://localhost:3000 en su navegador y borre caché (Ctrl+Shift+Supr)
pause