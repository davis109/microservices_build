# Export SOLUTION_APPROACH.md to PDF
# This script helps convert the markdown to PDF using various methods

Write-Host "=== SOLUTION_APPROACH.md to PDF Converter ===" -ForegroundColor Cyan
Write-Host ""

$markdownFile = "SOLUTION_APPROACH.md"
$outputPdf = "Kontrol_Solution_Approach.pdf"

# Check if file exists
if (-not (Test-Path $markdownFile)) {
    Write-Host "Error: $markdownFile not found!" -ForegroundColor Red
    exit 1
}

Write-Host "Found: $markdownFile" -ForegroundColor Green
Write-Host ""

# Method 1: Using VS Code (if available)
Write-Host "Method 1: Export via VS Code" -ForegroundColor Yellow
Write-Host "1. Open SOLUTION_APPROACH.md in VS Code"
Write-Host "2. Press Ctrl+Shift+P"
Write-Host "3. Type 'Markdown PDF: Export (pdf)'"
Write-Host "4. Press Enter"
Write-Host ""

# Method 2: Using Pandoc (if installed)
Write-Host "Method 2: Using Pandoc (if installed)" -ForegroundColor Yellow
if (Get-Command pandoc -ErrorAction SilentlyContinue) {
    Write-Host "Pandoc is installed! Converting..." -ForegroundColor Green
    try {
        pandoc $markdownFile -o $outputPdf --pdf-engine=wkhtmltopdf -V geometry:margin=1in
        if (Test-Path $outputPdf) {
            Write-Host "Success! Created: $outputPdf" -ForegroundColor Green
            Start-Process $outputPdf
        }
    } catch {
        Write-Host "Pandoc conversion failed. Try manual method." -ForegroundColor Red
    }
} else {
    Write-Host "Pandoc not installed. To install:" -ForegroundColor Yellow
    Write-Host "  choco install pandoc" -ForegroundColor Gray
    Write-Host "  (or download from https://pandoc.org/)" -ForegroundColor Gray
}
Write-Host ""

# Method 3: Using Word
Write-Host "Method 3: Export via Microsoft Word" -ForegroundColor Yellow
Write-Host "1. Open Microsoft Word"
Write-Host "2. File > Open > Browse to: $PWD\$markdownFile"
Write-Host "3. File > Save As > PDF"
Write-Host "4. Name it: $outputPdf"
Write-Host ""

# Method 4: Using Chrome/Edge
Write-Host "Method 4: Using Browser (Recommended)" -ForegroundColor Yellow
Write-Host "1. Open SOLUTION_APPROACH.md in VS Code"
Write-Host "2. Right-click > Open Preview (Ctrl+Shift+V)"
Write-Host "3. Click the 'Open in Browser' icon"
Write-Host "4. In browser: Ctrl+P > Save as PDF"
Write-Host "5. Name it: $outputPdf"
Write-Host ""

# Method 5: Online converter
Write-Host "Method 5: Online Converter (Quick)" -ForegroundColor Yellow
Write-Host "1. Go to: https://www.markdowntopdf.com/"
Write-Host "2. Upload: $markdownFile"
Write-Host "3. Download PDF"
Write-Host ""

# Quick option: Open in default markdown viewer
Write-Host "Opening file in default viewer..." -ForegroundColor Cyan
Start-Process $markdownFile

Write-Host ""
Write-Host "=== Instructions ===" -ForegroundColor Cyan
Write-Host "Choose one of the methods above to convert to PDF."
Write-Host "Recommended: Method 4 (Browser) for best formatting."
Write-Host ""
Write-Host "Target filename: $outputPdf" -ForegroundColor Green
Write-Host "File should be under 10 MB (current: ~50 KB)" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
