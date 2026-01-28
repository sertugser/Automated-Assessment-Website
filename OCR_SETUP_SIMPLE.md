# OCR Backend Kurulum Rehberi (BASIT YÖNTEM - API Key)

Bu rehber, **en basit yöntemle** Google Cloud Vision API'yi nasıl kuracağını gösterir. Service Account yerine direkt **API Key** kullanacağız.

## 📋 Adım Adım Kurulum

### 1️⃣ Backend Server'ı Kur

```bash
# server klasörüne git
cd server

# Bağımlılıkları yükle
npm install
```

### 2️⃣ Google Cloud Vision API Key Alma (ÇOK BASIT!)

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

#### D) API Key Oluştur (ÇOK KOLAY!)
- **"APIs & Services" > "Credentials"**
- Üstte **"+ CREATE CREDENTIALS"** tıkla
- **"API key"** seç
- Oluşturulan API key'i kopyala (örnek: `AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)

#### E) API Key'i Kısıtla (Güvenlik için - Opsiyonel ama ÖNERİLEN)
- Oluşturduğun API key'e tıkla
- **"API restrictions"** altında **"Restrict key"** seç
- **"Cloud Vision API"** seç → **Save**

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

```env
GOOGLE_CLOUD_VISION_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PORT=3001
```

> 💡 **Not**: `AIzaSyB...` kısmını kendi API key'inle değiştir!

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

## 📄 PDF Desteği Hakkında

**API Key ile PDF desteği:**
- ✅ Resimler: Tam destek
- ⚠️ PDF'ler: Sınırlı destek (sadece ilk sayfa işlenir)

**Tam PDF desteği için:**
Eğer çok sayfalı PDF'leri işlemek istiyorsan, Service Account kullanman gerekiyor. `OCR_SETUP.md` dosyasındaki Service Account kurulumunu takip et.

**Not:** Çoğu kullanım için API Key yeterli. Sadece çok sayfalı PDF'ler için Service Account gerekli.

## 🔧 Sorun Giderme

### "OCR service not configured" hatası
- `server/.env` dosyasında `GOOGLE_CLOUD_VISION_API_KEY` ayarlandığından emin ol
- API key'in doğru kopyalandığından emin ol (boşluk vs. olmamalı)

### "API key not valid" hatası
- API key'in doğru olduğundan emin ol
- Cloud Vision API'nin etkinleştirildiğinden emin ol
- API key kısıtlamalarını kontrol et

### "No text found" hatası
- Dosya gerçekten metin içeriyor mu kontrol et
- El yazısı çok karmaşıksa Google Vision bile zorlanabilir

## 💰 Maliyet

Google Cloud Vision API:
- **İlk 1000 istek/ay**: ÜCRETSİZ ✅
- **Sonrası**: ~$1.50 per 1000 istek

Detaylar: https://cloud.google.com/vision/pricing

## 🎉 Tamamlandı!

Artık profesyonel OCR servisin hazır! El yazısı dahil çok daha iyi sonuçlar alacaksın.
