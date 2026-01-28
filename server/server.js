import express from 'express';
import multer from 'multer';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PNG, JPG, JPEG, and PDF are allowed.'));
    }
  },
});

/**
 * OCR Endpoint using Google Cloud Vision API
 * POST /api/ocr
 * Body: FormData with 'file' field
 */
app.post('/api/ocr', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const source = req.body.source || (file.mimetype === 'application/pdf' ? 'pdf' : 'image');

    // Check if Google Vision API key is configured
    const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
    const credentialsPath = process.env.GOOGLE_CLOUD_VISION_API_KEY_PATH;
    
    if (!apiKey && !credentialsPath) {
      console.error('Google Cloud Vision API not configured');
      return res.status(500).json({ 
        error: 'OCR service not configured. Please set GOOGLE_CLOUD_VISION_API_KEY (simple API key) or GOOGLE_CLOUD_VISION_API_KEY_PATH (service account JSON) in .env' 
      });
    }

    let client;
    
    // Method 1: Simple API Key (easier setup) - Use REST API directly
    if (apiKey && !apiKey.startsWith('{')) {
      // Simple API key - use REST API
      const base64Content = file.buffer.toString('base64');
      
      if (source === 'pdf') {
        // PDF support: Use async batch annotation (requires Service Account)
        // Fallback: Try DOCUMENT_TEXT_DETECTION on first page as image
        // Note: Full PDF support requires Service Account, but we'll try basic detection
        
        try {
          // Try DOCUMENT_TEXT_DETECTION (works for PDF first page as image)
          const apiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
          
          const requestBody = {
            requests: [{
              image: { content: base64Content },
              features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
            }],
          };

          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          });

          if (!response.ok) {
            const errorText = await response.text();
            // If API Key doesn't support PDF, suggest Service Account
            if (errorText.includes('PDF') || errorText.includes('unsupported')) {
              throw new Error('PDF support requires Service Account. Please use GOOGLE_CLOUD_VISION_API_KEY_PATH instead of API key, or convert PDF to images.');
            }
            throw new Error(`Google Vision API error: ${response.status} - ${errorText}`);
          }

          const result = await response.json();
          let extractedText = '';

          if (result.responses && result.responses[0]) {
            const annotation = result.responses[0];
            if (annotation.fullTextAnnotation) {
              extractedText = annotation.fullTextAnnotation.text || '';
            }
          }

          if (!extractedText || extractedText.trim().length === 0) {
            return res.status(404).json({ 
              error: 'No text found in PDF. Full PDF support requires Service Account. Please use GOOGLE_CLOUD_VISION_API_KEY_PATH.',
              text: '' 
            });
          }

          return res.json({ 
            text: extractedText.trim(),
            source,
            confidence: 'medium', // Limited PDF support with API Key
            note: 'Only first page processed. For full PDF support, use Service Account.'
          });
        } catch (pdfError) {
          // If PDF fails, suggest Service Account
          return res.status(500).json({ 
            error: `PDF processing failed: ${pdfError.message}. For full PDF support, please use Service Account (GOOGLE_CLOUD_VISION_API_KEY_PATH) instead of API key.`,
            text: '' 
          });
        }
      } else {
        // Image support: Use TEXT_DETECTION
        const apiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
        
        const requestBody = {
          requests: [{
            image: { content: base64Content },
            features: [{ type: 'TEXT_DETECTION' }],
          }],
        };

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Google Vision API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        let extractedText = '';

        if (result.responses && result.responses[0]) {
          const annotation = result.responses[0];
          if (annotation.textAnnotations && annotation.textAnnotations.length > 0) {
            extractedText = annotation.textAnnotations[0].description || '';
          }
        }

        if (!extractedText || extractedText.trim().length === 0) {
          return res.status(404).json({ 
            error: 'No text found in the uploaded file',
            text: '' 
          });
        }

        return res.json({ 
          text: extractedText.trim(),
          source,
          confidence: 'high'
        });
      }
    }
    // Method 2: Service Account JSON (file path)
    else if (credentialsPath) {
      const vision = await import('@google-cloud/vision');
      client = new vision.ImageAnnotatorClient({
        keyFilename: credentialsPath,
      });
    }
    // Method 3: Service Account JSON (string)
    else if (apiKey && apiKey.startsWith('{')) {
      try {
        const vision = await import('@google-cloud/vision');
        client = new vision.ImageAnnotatorClient({
          credentials: JSON.parse(apiKey),
        });
      } catch (e) {
        return res.status(500).json({ 
          error: 'Invalid GOOGLE_CLOUD_VISION_API_KEY format. Must be valid JSON string or simple API key.' 
        });
      }
    }

    let extractedText = '';

    if (source === 'pdf') {
      // For PDF, use DOCUMENT_TEXT_DETECTION (better for documents)
      const [result] = await client.documentTextDetection({
        image: { content: file.buffer },
      });

      if (result.fullTextAnnotation) {
        extractedText = result.fullTextAnnotation.text;
      }
    } else {
      // For images, use TEXT_DETECTION (handles handwriting better)
      const [result] = await client.textDetection({
        image: { content: file.buffer },
      });

      if (result.textAnnotations && result.textAnnotations.length > 0) {
        // First annotation is the full text
        extractedText = result.textAnnotations[0].description || '';
      }
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(404).json({ 
        error: 'No text found in the uploaded file',
        text: '' 
      });
    }

    res.json({ 
      text: extractedText.trim(),
      source,
      confidence: 'high' // Google Vision provides high-quality OCR
    });

  } catch (error) {
    console.error('OCR Error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to process OCR request',
      text: '' 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'OCR API' });
});

app.listen(PORT, () => {
  console.log(`🚀 OCR Backend Server running on http://localhost:${PORT}`);
  console.log(`📝 OCR endpoint: http://localhost:${PORT}/api/ocr`);
  console.log(`💡 Make sure to set GOOGLE_CLOUD_VISION_API_KEY in .env`);
});
