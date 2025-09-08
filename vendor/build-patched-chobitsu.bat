@echo off
REM https://github.com/liriliri/chobitsu/issues/18

REM Exit on any error
setlocal enabledelayedexpansion

echo Building patched chobitsu...

REM Remove the existing directory
rmdir /s /q chobitsu
if errorlevel 1 (
    echo Failed to remove chobitsu directory
    exit /b 1
)

REM Clone the repository
git clone https://github.com/liriliri/chobitsu
if errorlevel 1 (
    echo Failed to clone chobitsu repository
    exit /b 1
)

REM Change to chobitsu directory
cd chobitsu
if errorlevel 1 (
    echo Failed to change to chobitsu directory
    exit /b 1
)

REM Checkout specific version
git checkout v1.8.4
if errorlevel 1 (
    echo Failed to checkout v1.8.4
    exit /b 1
)

REM Apply the patch
git apply ../chobitsu.patch
if errorlevel 1 (
    echo Failed to apply chobitsu.patch
    exit /b 1
)

REM Install dependencies
npm install
if errorlevel 1 (
    echo Failed to install npm dependencies
    exit /b 1
)

REM Build the project
npm run build
if errorlevel 1 (
    echo Failed to build chobitsu
    exit /b 1
)

echo Chobitsu build completed successfully!
