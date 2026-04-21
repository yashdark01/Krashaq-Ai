# 🌾 Krashaq - Smart Farming Assistant

A full-stack agricultural assistant that provides AI-powered farming advice, weather updates, and smart irrigation recommendations through WhatsApp two-way communication and a Web interface.

## Features

- 🤖 **AI-powered farming advice** using LLM (Ollama with Gemini fallback)
- 🌦️ **WeatherAPI.com integration** for accurate weather forecasts
- 💧 **Smart irrigation recommendations** based on temperature, humidity, and rainfall
- 📱 **WhatsApp two-way communication** via Twilio with intent detection
- �️ **Voice message support** with faster-whisper STT for audio transcription
- � **Web chat interface** for easy access
- 👨‍🌾 **Farmer management** with registration and location tracking
- 🗣️ **Multi-language support** (Hindi Devanagari script, English, Hinglish)
- 📍 **Location-aware responses** using farmer's location context
- 🎯 **Intent detection** for irrigation, weather, and general queries

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **MongoDB** - NoSQL database with PyMongo
- **Ollama** - Local LLM for AI responses (primary)
- **Google Gemini** - Cloud LLM fallback
- **WeatherAPI.com** - Real weather data
- **Twilio** - WhatsApp messaging
- **faster-whisper** - Speech-to-text transcription
- **ffmpeg** - Audio format conversion
- **APScheduler** - Background job scheduling
- **Redis** - Caching layer

### Frontend
- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe code
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - UI component library

## Quick Start

### 1. Setup Backend

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Create .env file with your API credentials
cp .env.example .env
# Edit .env and add your real credentials:
# - WEATHER_API_KEY (from WeatherAPI.com)
# - TWILIO_ACCOUNT_SID
# - TWILIO_AUTH_TOKEN
# - TWILIO_WHATSAPP_NUMBER
# - MONGODB_URL (or use default localhost)
# - GOOGLE_API_KEY (for Gemini LLM fallback)
# - OLLAMA_BASE_URL (default: http://127.0.0.1:11434)

# Ensure Ollama is running (for local LLM)
ollama serve
ollama pull llama3.1:8b  # or your preferred model

# Run the backend
uvicorn app.main:app --reload --port 8000
```

Backend will be available at `http://localhost:8000`

### 2. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run the frontend
npm run dev
```

Frontend will be available at `http://localhost:3000`

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check & API info |
| `/api/chat` | POST | Web chat interface with AI |
| `/api/weather` | GET | Get weather for a location |
| `/api/farmers` | GET/POST | List/Create farmers |
| `/webhook` | POST | Twilio WhatsApp webhook (two-way AI communication) |
| `/send-whatsapp` | POST | Send proactive WhatsApp message |
| `/api/locations/*` | GET | Location hierarchy data |
| `/api/admin/*` | Various | Admin operations (admin only) |

## WhatsApp Setup

1. **Get Twilio WhatsApp Sandbox:**
   - Go to [Twilio Console](https://console.twilio.com/)
   - Navigate to Messaging → Try it out → Send a WhatsApp message
   - Note your sandbox number and join code

2. **Configure Webhook:**
   - For local testing, use [ngrok](https://ngrok.com/):
     ```bash
     ngrok http 8000
     ```
   - Copy the HTTPS URL and add `/webhook` to it
   - Paste this in Twilio Console → Messaging → WhatsApp → Sandbox Settings → When a message comes in

3. **Test:**
   - Send "join [your-sandbox-name]" to your Twilio WhatsApp number
   - Then send any message:
     - "weather" or "mausam" - Get weather information
     - "irrigate" or "paani" - Get irrigation advice
     - Any general query like "Madhya Pradesh mein sabse jyada konsi fasal ki kheti hoti hai?" - Get AI-powered response in Hindi

## Usage Examples

### Web Chat
1. Open `http://localhost:3000`
2. Set your location (default: Delhi)
3. Send messages:
   - "weather" - Get current weather
   - "irrigate" - Get irrigation advice
   - Any other message - Get AI-powered response with weather + advice

### WhatsApp
Send these to your Twilio number:
- **Text messages**: 
  - Irrigation queries: "paani", "sinchai", "water", "irrigation"
  - Weather queries: "mausam", "weather", "barish", "rain"
  - General queries: Any question about farming, crops, prices, etc. (AI-powered response)
- **Voice messages**: Send voice notes in Hindi or English (will be transcribed using STT)

The system will:
- Detect intent (irrigation/weather/general)
- Transcribe voice messages using faster-whisper
- Use farmer's location for accurate responses
- Respond in farmer's preferred language (Hindi/English)
- Use AI (Ollama) for general queries

### Register a Farmer
```bash
curl -X POST http://localhost:8000/api/farmers \
  -H "Content-Type: application/json" \
  -d '{"name":"Ram Singh","phone":"+919876543210","location":"Mumbai"}'
```

### Send WhatsApp Message
```bash
curl -X POST "http://localhost:8000/send-whatsapp?to=+919876543210&message=Hello%20farmer!"
```

## Project Structure

```
Krashaq-Ai/
├── backend/
│   ├── app/
│   │   ├── config/            # Configuration files
│   │   ├── db/                # MongoDB connection and models
│   │   ├── middleware/        # Custom middleware
│   │   ├── routes/            # API endpoints
│   │   │   ├── webhook.py     # Twilio WhatsApp webhook
│   │   │   ├── chat.py        # Web chat API
│   │   │   ├── user.py        # User/farmer CRUD
│   │   │   ├── auth.py        # Authentication
│   │   │   ├── locations.py   # Location hierarchy
│   │   │   └── admin.py       # Admin operations
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── services/          # Business logic
│   │   │   ├── query_handler.py    # Intent detection & routing
│   │   │   ├── whatsapp_sender.py  # WhatsApp message sender
│   │   │   ├── irrigation_decision.py  # Irrigation logic
│   │   │   ├── weather.py     # WeatherAPI.com integration
│   │   │   ├── irrigation.py  # Irrigation advice
│   │   │   ├── llm_agent.py   # LLM orchestration
│   │   │   ├── llm_provider.py # Multi-provider LLM factory
│   │   │   └── agent_router.py # LangGraph agent
│   │   ├── config.py          # Application settings
│   │   ├── main.py            # FastAPI app entry
│   │   └── scheduler.py       # Background job scheduler
│   ├── scripts/               # Utility scripts
│   ├── .env                   # API credentials (create this)
│   ├── .env.example           # Template
│   └── requirements.txt
├── frontend/
│   ├── app/                   # Next.js app router
│   │   ├── auth/              # Authentication pages
│   │   ├── farmers/           # Farmers management
│   │   ├── admin/             # Admin dashboard
│   │   ├── api/               # API routes
│   │   └── layout.tsx         # Root layout
│   ├── components/
│   │   ├── auth/              # Authentication components
│   │   ├── chat/              # Chat interface
│   │   ├── dashboard/         # Dashboard components
│   │   ├── admin/             # Admin components
│   │   └── ui/                # shadcn/ui components
│   ├── contexts/              # React contexts
│   └── package.json
└── README.md
```

## Environment Variables

Create `backend/.env` with:

```env
# WeatherAPI.com (get from https://www.weatherapi.com/)
WEATHER_API_KEY=your_api_key_here

# Twilio (get from https://console.twilio.com/)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=+14155238886

# MongoDB (default: mongodb://localhost:27017/krashaq)
MONGODB_URL=mongodb://localhost:27017/krashaq

# LLM Configuration
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.1:8b
GOOGLE_API_KEY=your_google_api_key_here  # For Gemini fallback

# JWT Configuration
JWT_SECRET_KEY=your-super-secret-jwt-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback

# Redis (optional, for caching)
REDIS_URL=redis://localhost:6379/0
REDIS_CACHE_TTL=1200
```

## Smart Irrigation Logic

The app provides context-aware irrigation advice based on:

- **Temperature:** 
  - >38°C: Extreme heat, irrigate early morning only
  - >35°C: High heat, avoid afternoon watering
  - <20°C: Reduced evaporation, normal schedule

- **Humidity:**
  - <30%: Low humidity, faster soil drying
  - >80%: High humidity, risk of fungal diseases

- **Rainfall:**
  - >5mm: Skip irrigation
  - >0mm: Reduce irrigation by 50%

## Future Enhancements

- [ ] Crop-specific advice (rice, wheat, cotton, etc.)
- [ ] Regional language support (Punjabi, Gujarati, Marathi, etc.)
- [ ] IoT sensor integration
- [ ] Push notifications for weather alerts
- [ ] Admin dashboard with analytics
- [ ] Image recognition for pest/disease detection
- [ ] File upload for crop photos
- [ ] Market price integration
- [ ] RAG implementation with vector database

## License

MIT License

## Support

For issues or questions, please check:
1. API credentials are correctly set in `.env`
2. Backend is running on port 8000
3. Frontend is running on port 3000
4. For WhatsApp, ngrok is running and webhook URL is configured
