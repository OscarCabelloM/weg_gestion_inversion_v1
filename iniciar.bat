@echo off
echo ==========================================
echo  Gestión_Inversiones.v.1.8 - Iniciando...
echo ==========================================
echo.

echo [1/3] Instalando dependencias...
call npm install
if %errorlevel% neq 0 (
    echo Error al instalar dependencias
    pause
    exit /b 1
)

echo.
echo [2/3] Iniciando backend (API Yahoo) en puerto 3001...
start "Backend API" cmd /k "cd /d %~dp0 && npm run api"

echo.
echo [3/3] Iniciando frontend (Vite) en puerto 5173...
start "Frontend Vite" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo ==========================================
echo  ¡Proyecto iniciado!
echo  Frontend: http://localhost:5173
echo  Backend:  http://localhost:3001
echo ==========================================
echo.
echo Presiona Ctrl+C en cada ventana para detener.
timeout /t 5 >nul