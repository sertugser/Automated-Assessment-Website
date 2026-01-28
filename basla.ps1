# Projeyi başlatmak için PowerShell scripti
# Kullanım: .\basla.ps1

Write-Host "=== Automated Assessment Website Başlatılıyor ===" -ForegroundColor Cyan

# Proje dizinine git
$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectPath

# Node.js kontrolü
Write-Host "`nNode.js kontrol ediliyor..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js bulundu: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js bulunamadı! Lütfen Node.js yükleyin: https://nodejs.org" -ForegroundColor Red
    exit 1
}

# npm kontrolü
Write-Host "`nnpm kontrol ediliyor..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "✓ npm bulundu: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ npm bulunamadı!" -ForegroundColor Red
    exit 1
}

# node_modules kontrolü
if (-not (Test-Path "node_modules")) {
    Write-Host "`nBağımlılıklar yükleniyor (ilk kez çalıştırıyorsanız birkaç dakika sürebilir)..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Bağımlılık yükleme başarısız!" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Bağımlılıklar yüklendi" -ForegroundColor Green
} else {
    Write-Host "`n✓ Bağımlılıklar zaten yüklü" -ForegroundColor Green
}

# .env dosyası kontrolü
if (-not (Test-Path ".env")) {
    Write-Host "`.env dosyası oluşturuluyor..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item .env.example .env
        Write-Host "✓ .env dosyası oluşturuldu (.env.example'dan kopyalandı)" -ForegroundColor Green
        Write-Host "⚠ ÖNEMLİ: .env dosyasını açıp API anahtarlarınızı eklemeyi unutmayın!" -ForegroundColor Yellow
    } else {
        Write-Host "⚠ .env.example dosyası bulunamadı" -ForegroundColor Yellow
    }
} else {
    Write-Host "`n✓ .env dosyası mevcut" -ForegroundColor Green
}

# Geliştirme sunucusunu başlat
Write-Host "`n=== Geliştirme sunucusu başlatılıyor ===" -ForegroundColor Cyan
Write-Host "Tarayıcı otomatik olarak açılacak: http://localhost:3000" -ForegroundColor Green
Write-Host "Durdurmak için: Ctrl+C`n" -ForegroundColor Yellow

npm run dev
