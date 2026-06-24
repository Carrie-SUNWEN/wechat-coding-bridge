@echo off
chcp 65001 >nul
title WeChat - Claude Code bridge
cd /d "%~dp0"
echo Starting WeChat - Claude Code bridge ...
echo Close this window = bridge offline.
echo.
python wechat_bridge.py
echo.
echo === bridge exited ===
pause >nul
