@echo off
REM Double-click to launch the Spawner Box Generator locally (no main server needed).
cd /d "%~dp0"
node serve.mjs %1
pause
