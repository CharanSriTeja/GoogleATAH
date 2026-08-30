@echo off
echo Starting Internship Agent Backend...

REM 1. Clear any aggressive global Python/Anaconda variables that might hijack the process
set PYTHONPATH=
set PYTHONHOME=

REM 2. Forcibly prepend the virtual environment to the top of the PATH so it wins
set PATH=%CD%\venv\Scripts;%PATH%

REM 3. Run uvicorn directly using the isolated python executable without reload to prevent child process hijacking
.\venv\Scripts\python.exe -I -m uvicorn main:app
