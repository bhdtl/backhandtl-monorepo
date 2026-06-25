@echo off
echo ============================================
echo  Injury Intel Bot v2.0
echo ============================================
echo.
echo Starte Injury Scraper (einmaliger Scan)...
echo.
cd /d "%~dp0"
python injury_scraper.py --once
echo.
echo ============================================
echo  Scan abgeschlossen!
echo ============================================
pause