@echo off
rem Abre el launcher grafico de Ferreteria La Panamena.
rem No modifica la politica global de PowerShell.
start "Ferreteria La Panamena" powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0scripts\launcher.ps1"
