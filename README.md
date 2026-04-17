# 🌾 Krashaq - Smart Farming Assistant

A full-stack agricultural assistant that provides weather updates and smart irrigation advice through WhatsApp and a Web interface.

## Features

- 🤖 **AI-powered farming advice** based on real weather data
- 🌦️ **OpenWeatherMap integration** for accurate weather forecasts
- 💧 **Smart irrigation recommendations** based on temperature, humidity, and rainfall
- 📱 **WhatsApp integration** via Twilio for farmer communication
- 🌐 **Web chat interface** for easy access
- 👨‍🌾 **Farmer management** with registration and location tracking

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLite** - Database (easy to migrate to PostgreSQL)
- **SQLAlchemy** - ORM for database operations
- **OpenWeatherMap API** - Real weather data
- **Twilio** - WhatsApp messaging

### Frontend
- **Next.js 14** - React framework
- **TypeScript** - Type-safe code
- **Tailwind CSS** - Utility-first styling

## Quick Start

### 1. Setup Backend

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Create .env file with your API credentials
cp .env.example .env
# Edit .env and add your real credentials:
# - OPENWEATHERMAP_API_KEY
# - TWILIO_ACCOUNT_SID
# - TWILIO_AUTH_TOKEN
# - TWILIO_WHATSAPP_NUMBER

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
| `/api/chat` | POST | Web chat interface |
| `/api/weather` | GET | Get weather for a city |
| `/api/farmers` | GET/POST | List/Create farmers |
| `/webhook` | POST | Twilio WhatsApp webhook |
| `/send-whatsapp` | POST | Send proactive WhatsApp message |

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
   - Then send any message like "weather" or "irrigate"

## Usage Examples

### Web Chat
1. Open `http://localhost:3000`
2. Set your location (default: Delhi)
3. Send messages:
   - "weather" - Get current weather
   - "irrigate" - Get irrigation advice
   - Any other message - Get smart response with weather + advice

### WhatsApp
Send these keywords to your Twilio number:
- `weather` - Current weather update
- `irrigate` - Irrigation recommendations
- `help` - List of available commands

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
│   │   ├── config.py          # Environment variables
│   │   ├── db.py              # Database setup
│   │   ├── models.py          # SQLAlchemy models
│   │   ├── main.py            # FastAPI app entry
│   │   ├── routes/
│   │   │   ├── webhook.py     # Twilio WhatsApp webhook
│   │   │   ├── chat.py        # Web chat API
│   │   │   └── user.py        # Farmer CRUD
│   │   └── services/
│   │       ├── weather.py     # OpenWeatherMap API
│   │       └── irrigation.py  # Smart irrigation logic
│   ├── .env                   # API credentials (create this)
│   ├── .env.example           # Template
│   └── requirements.txt
├── frontend/
│   ├── app/                   # Next.js app router
│   ├── components/
│   │   ├── ChatBox.tsx        # Chat interface
│   │   └── FarmerForm.tsx     # Farmer registration form
│   └── package.json
└── README.md
```

## Environment Variables

Create `backend/.env` with:

```env
# OpenWeatherMap (get from https://openweathermap.org/api)
OPENWEATHERMAP_API_KEY=your_api_key_here

# Twilio (get from https://console.twilio.com/)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=+14155238886
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

- [ ] PostgreSQL database for production
- [ ] LLM integration for natural conversations
- [ ] Crop-specific advice (rice, wheat, cotton, etc.)
- [ ] Multi-language support (Hindi, regional languages)
- [ ] IoT sensor integration
- [ ] Push notifications for weather alerts
- [ ] Admin dashboard with analytics

## License

MIT License

## Support

For issues or questions, please check:
1. API credentials are correctly set in `.env`
2. Backend is running on port 8000
3. Frontend is running on port 3000
4. For WhatsApp, ngrok is running and webhook URL is configured
