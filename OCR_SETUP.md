# OCR Backend Kurulum Rehberi

Bu rehber, el yazısı ve zor görseller için profesyonel OCR servisini nasıl kuracağını gösterir.

## 📋 Adım Adım Kurulum

### 1️⃣ Backend Server'ı Kur

```bash
# server klasörüne git
cd server

# Bağımlılıkları yükle
npm install
```

### 2️⃣ Google Cloud Vision API Key Alma

#### A) Google Cloud Console'a Git
- [Google Cloud Console](https://console.cloud.google.com/) → Giriş yap

#### B) Proje Oluştur/Seç
- Üstteki proje dropdown'ından **"New Project"** seç
- İsim ver (örn: `assessai-ocr`)
- **Create** tıkla

#### C) Cloud Vision API'yi Etkinleştir
- Sol menüden **"APIs & Services" > "Library"**
- Arama kutusuna **"Cloud Vision API"** yaz
- **Cloud Vision API**'yi aç → **"Enable"** tıkla

#### D) Service Account Oluştur
- **"APIs & Services" > "Credentials"**
- **"+ CREATE CREDENTIALS" > "Service Account"**
- **Service account name**: `ocr-service`
- **Role**: **"Cloud Vision API User"** seç
- **Create and Continue** → **Done**

#### E) Key İndir
- Oluşturduğun service account'a tıkla
- **"Keys"** sekmesi → **"Add Key" > "Create new key"**
- **JSON** seç → **Create**
- İndirilen JSON dosyasını `server/` klasörüne kopyala (örn: `server/credentials.json`)

### 3️⃣ Environment Variables Ayarla

`server/` klasöründe `.env` dosyası oluştur:

```bash
cd server
# Windows PowerShell için:
New-Item -ItemType File -Name .env

# Mac/Linux için:
touch .env
```

`.env` dosyasına şunu ekle:

**Seçenek 1: JSON dosya yolu kullan (ÖNERİLEN)**
```env
GOOGLE_CLOUD_VISION_API_KEY_PATH=./credentials.json
PORT=3001
```

**Seçenek 2: JSON içeriğini direkt string olarak**
```env
GOOGLE_CLOUD_VISION_API_KEY={"type":"service_account","project_id":"...","private_key":"..."}
PORT=3001
```

> ⚠️ **Not**: Seçenek 2 için JSON içeriğini tek satırda, tırnak işaretlerini escape ederek yazmalısın.

### 4️⃣ Backend Server'ı Başlat

```bash
cd server
npm start
```

Başarılı olursa şunu göreceksin:
```
🚀 OCR Backend Server running on http://localhost:3001
📝 OCR endpoint: http://localhost:3001/api/ocr
```

### 5️⃣ Frontend'i Bağla

Proje ana klasöründe `.env` dosyası oluştur (yoksa):

```bash
# Ana klasörde
# Windows PowerShell:
New-Item -ItemType File -Name .env

# Mac/Linux:
touch .env
```

`.env` dosyasına ekle:

```env
VITE_OCR_API_URL=http://localhost:3001/api/ocr
```

### 6️⃣ Frontend Dev Server'ı Yeniden Başlat

```bash
# Ana klasörde
npm run dev
```

> ⚠️ **Önemli**: `.env` değişikliklerinden sonra dev server'ı **mutlaka yeniden başlat**.

## ✅ Test Et

1. Frontend'de bir resim veya PDF yükle
2. Toast mesajında **"using external OCR API"** yazısını gör
3. Metin başarıyla çıkarıldıysa textarea'da görünür

## 🔧 Sorun Giderme

### "OCR service not configured" hatası
- `server/.env` dosyasında `GOOGLE_CLOUD_VISION_API_KEY` veya `GOOGLE_CLOUD_VISION_API_KEY_PATH` ayarlandığından emin ol
- JSON dosyasının doğru yolda olduğunu kontrol et

### "No text found" hatası
- Dosya gerçekten metin içeriyor mu kontrol et
- El yazısı çok karmaşıksa Google Vision bile zorlanabilir

### Port çakışması
- `server/.env` içinde `PORT=3002` gibi farklı bir port dene
- Frontend `.env`'deki `VITE_OCR_API_URL`'i de güncelle

### CORS hatası
- Backend `server.js` içinde `cors()` middleware'i var, sorun olmamalı
- Eğer hala CORS hatası alıyorsan, backend'i yeniden başlat

## 🚀 Production'a Geçerken

Production'da backend'i bir cloud servise deploy et:
- **Vercel** (serverless functions)
- **Railway**
- **Render**
- **Google Cloud Run**

Sonra frontend `.env`'deki `VITE_OCR_API_URL`'i production URL'ine güncelle.

## 💰 Maliyet

Google Cloud Vision API:
- **İlk 1000 istek/ay**: ÜCRETSİZ
- **Sonrası**: ~$1.50 per 1000 istek

Detaylar: https://cloud.google.com/vision/pricing
