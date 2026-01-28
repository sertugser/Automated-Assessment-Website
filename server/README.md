# OCR Backend Server

Bu backend servisi, Google Cloud Vision API kullanarak PDF ve resim dosyalarından metin çıkarma (OCR) işlemi yapar.

## Kurulum

### 1. Bağımlılıkları Yükle

```bash
cd server
npm install
```

### 2. Google Cloud Vision API Key Alma

1. [Google Cloud Console](https://console.cloud.google.com/)'a git
2. Yeni bir proje oluştur veya mevcut projeyi seç
3. **APIs & Services > Library**'den **Cloud Vision API**'yi etkinleştir
4. **APIs & Services > Credentials**'dan yeni bir **Service Account** oluştur:
   - **Create Credentials > Service Account**
   - İsim ver (örn: `ocr-service`)
   - **Role**: `Cloud Vision API User` seç
   - **Create Key > JSON** ile indir
5. İndirdiğin JSON dosyasını `server/` klasörüne kopyala (veya içeriğini `.env`'e yapıştır)

### 3. Environment Variables Ayarla

`.env.example` dosyasını kopyalayıp `.env` oluştur:

```bash
cp .env.example .env
```

Sonra `.env` dosyasını düzenle:

**Seçenek 1: JSON credentials'ı direkt string olarak ekle**
```env
GOOGLE_CLOUD_VISION_API_KEY={"type":"service_account","project_id":"...","private_key":"..."}
```

**Seçenek 2: JSON dosya yolu kullan**
```env
GOOGLE_CLOUD_VISION_API_KEY_PATH=./your-credentials.json
```

### 4. Server'ı Başlat

```bash
npm start
# veya development mode için:
npm run dev
```

Server `http://localhost:3001` adresinde çalışacak.

## API Kullanımı

### POST /api/ocr

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body:
  - `file`: PDF veya resim dosyası (PNG, JPG, JPEG)
  - `source`: (opsiyonel) `"pdf"` veya `"image"`

**Response:**
```json
{
  "text": "Çıkarılmış metin burada...",
  "source": "pdf",
  "confidence": "high"
}
```

**cURL Örneği:**
```bash
curl -X POST http://localhost:3001/api/ocr \
  -F "file=@example.pdf" \
  -F "source=pdf"
```

## Frontend Entegrasyonu

Frontend `.env` dosyasına ekle:

```env
VITE_OCR_API_URL=http://localhost:3001/api/ocr
```

## Alternatif OCR Servisleri

Eğer Google Cloud Vision yerine başka bir servis kullanmak istersen:

### Azure Computer Vision
- Paket: `@azure/cognitiveservices-computervision`
- [Dokümantasyon](https://docs.microsoft.com/azure/cognitive-services/computer-vision/)

### AWS Textract
- Paket: `@aws-sdk/client-textract`
- [Dokümantasyon](https://docs.aws.amazon.com/textract/)

## Sorun Giderme

- **"OCR service not configured" hatası**: `.env` dosyasında `GOOGLE_CLOUD_VISION_API_KEY` ayarlandığından emin ol
- **"No text found"**: Dosya gerçekten metin içeriyor mu kontrol et
- **Port çakışması**: `.env` içinde `PORT` değerini değiştir
