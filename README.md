# 🎵 Musij Backend API

Backend API untuk platform music streaming Musij dengan integrasi 3 Public APIs.

## 🌐 Live API

**Base URL:** `https://musij-backend.onrender.com/api`

**Health Check:** `https://musij-backend.onrender.com/api/health`

## 🎯 API Integrations

### 1. 💳 Stripe Payment API
Menangani pembayaran subscription Premium dengan Stripe Checkout.

**Environment Variables:**
```env
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

**Endpoints:**
- `POST /api/payment/create-checkout-session` - Create payment session
- `GET /api/payment/session/:sessionId` - Get session status

---

### 2. 🎵 Spotify Web API
Menyediakan data musik dari katalog Spotify.

**Environment Variables:**
```env
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
```

**Endpoints:**
- `GET /api/music/search?q={query}` - Search tracks
- `GET /api/music/track/:id` - Get track details
- `GET /api/music/artist/:id` - Get artist info
- `GET /api/music/artist/:id/top-tracks` - Get artist's top tracks

**Features:**
- OAuth 2.0 Client Credentials Flow
- Token caching (58 minutes TTL)
- Search dengan market=ID filter
- Album artwork high resolution

---

### 3. 📝 Genius Lyrics API
Menyediakan metadata lagu dan informasi lirik.

**Environment Variables:**
```env
GENIUS_ACCESS_TOKEN=your_access_token
```

**Endpoints:**
- `GET /api/lyrics/search?q={query}` - Search songs
- `GET /api/lyrics/song/:songId` - Get song details
- `GET /api/lyrics/artist/:artistId` - Get artist info
- `GET /api/lyrics/test` - Test API connection

**Features:**
- Song metadata (title, artist, album, release date)
- Song artwork dari Genius CDN
- Song descriptions dan annotations preview
- Data caching (7 days TTL)

---

## 🛠️ Tech Stack

- **Runtime:** Node.js v16+
- **Framework:** Express.js
- **APIs:** Stripe, Spotify, Genius
- **Caching:** node-cache
- **HTTP Client:** axios
- **Environment:** dotenv
- **CORS:** cors middleware

## 📁 Project Structure

```
musij-backend/
├── server.js           # Main Express server
├── package.json        # Dependencies
├── .env.example        # Environment template
├── .gitignore         # Git ignore rules
├── config/            # Configuration files
└── routes/            # API routes
    ├── stripe.js      # Stripe payment routes
    ├── spotify.js     # Spotify music routes
    └── genius.js      # Genius lyrics routes
```

## 🚀 Local Development

### Prerequisites
- Node.js v16+ ([Download](https://nodejs.org))
- npm atau yarn
- API keys (Stripe, Spotify, Genius)

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment:**
```bash
# Copy template
cp .env.example .env

# Edit .env dan isi dengan API keys Anda
notepad .env
```

3. **Run development server:**
```bash
npm run dev
```

Server akan running di `http://localhost:3000`

### Environment Variables

```env
# Server Configuration
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://127.0.0.1:5500

# Stripe Payment API
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Spotify Web API
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...

# Genius Lyrics API
GENIUS_ACCESS_TOKEN=...
```

## 📡 API Documentation

### Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "status": "OK",
  "message": "Musij Backend API is running",
  "timestamp": "2025-11-07T12:00:00.000Z",
  "apis": {
    "stripe": true,
    "spotify": true,
    "genius": true
  }
}
```

### Payment Endpoints

#### Create Checkout Session
```http
POST /api/payment/create-checkout-session
Content-Type: application/json

{
  "plan": "family"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

### Music Endpoints

#### Search Tracks
```http
GET /api/music/search?q=Duka+Last+Child&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "spotify_track_id",
      "name": "Duka",
      "artist": "Last Child",
      "album": "Surat Cinta Untuk Starla",
      "image": "https://i.scdn.co/image/...",
      "preview_url": "https://p.scdn.co/mp3-preview/...",
      "duration_ms": 240000,
      "popularity": 75
    }
  ]
}
```

### Lyrics Endpoints

#### Search Songs
```http
GET /api/lyrics/search?q=Duka
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 4106976,
      "title": "Duka",
      "artist": "Last Child (band)",
      "url": "https://genius.com/Last-child-band-duka-lyrics",
      "song_art_image_url": "https://images.genius.com/..."
    }
  ]
}
```

## 🌐 Deployment (Render)

### Deploy Steps:

1. **Push to GitHub**
```bash
git add .
git commit -m "Backend ready for deployment"
git push origin master
```

2. **Render Dashboard**
   - Buka [Render.com](https://render.com)
   - Login dengan GitHub
   - New → Web Service
   - Connect repository `musij-backend`

3. **Configuration:**
   - **Name:** musij-backend
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Plan:** Free

4. **Environment Variables:**
   Set semua variables dari `.env` di Render dashboard

5. **Deploy!**

### Production URL
```
https://musij-backend.onrender.com
```

## 🔒 Security

- ✅ CORS configured untuk frontend origin saja
- ✅ Environment variables tidak di-commit
- ✅ API keys di-encrypt di Render
- ✅ HTTPS otomatis dari Render
- ✅ Rate limiting (bisa ditambah jika perlu)

## 📊 Caching Strategy

- **Spotify Access Token:** 58 minutes (sesuai expiry)
- **Genius Song Data:** 7 days
- **Artist Info:** 24 hours

## 🧪 Testing

Test endpoints dengan curl atau Postman:

```bash
# Health check
curl http://localhost:3000/api/health

# Search music
curl http://localhost:3000/api/music/search?q=Duka

# Search lyrics
curl http://localhost:3000/api/lyrics/search?q=Duka
```

## 🐛 Troubleshooting

**Error: Cannot connect to Spotify**
- Cek SPOTIFY_CLIENT_ID dan SPOTIFY_CLIENT_SECRET
- Token mungkin expired, restart server

**Error: Stripe checkout failed**
- Cek STRIPE_SECRET_KEY valid
- Pastikan menggunakan test mode keys

**Error: Genius 401 Unauthorized**
- Cek GENIUS_ACCESS_TOKEN valid
- Generate ulang token di genius.com/api-clients

## 🔗 Related Repositories

- [Frontend](https://github.com/AltVar/musij-frontend) - Musij frontend application

## 📄 License

Educational project for Teknologi Sistem Terintegrasi course

---

**Developed with ❤️ for UTS TST 2025**
