@echo off
cd /d "C:\Users\Jesica Echeverria\Desktop\Configuracion Agentes Antigravity\Paginas web\gastro-dash"
echo Iniciando Gastro Dash...
start cmd /k "npm run dev"
echo Esperando a que el servidor este listo...
timeout /t 3 /nobreak > NUL
start http://localhost:5173
exit
