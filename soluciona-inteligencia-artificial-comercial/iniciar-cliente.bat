@echo off
if "%1"=="" (
  echo Uso: iniciar-cliente.bat ^<nombre-cliente^>
  echo Ejemplo: iniciar-cliente.bat mi-negocio
  pause
  exit /b
)
node index.js --cliente "clientes\%1.json"