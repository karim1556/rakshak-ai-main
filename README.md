# Rakshak AI - Emergency Intelligence Platform

A multi-role emergency intelligence platform that assists civilians, medical responders, and police/rescue teams during emergencies.

## Features

### For Citizens
- **Emergency Call**: Quick dial to 112
- **AI-Powered Guidance**: Describe your emergency and get step-by-step instructions
- **Voice Input**: Speak your emergency description using Web Speech API
- **Voice Output**: Listen to instructions with text-to-speech

### For Responders
- **Medical Dashboard**: View and manage medical incidents
- **Police Dashboard**: View and manage safety/security incidents  
- **Real-time Updates**: Incidents sync across all dashboards
- **Tactical Advice**: AI-generated guidance for responders

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: ShadCN UI
- **AI**: OpenAI GPT-4 via AI SDK
- **State Management**: Zustand
- **Voice**: Web Speech API + LiveKit (optional)
- **Maps**: Leaflet + OpenStreetMap

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Add your OpenAI API key to .env.local
# OPENAI_API_KEY=your_key_here

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## App Routes

| Route | Description |
|-------|-------------|
| `/` | Home - Two big buttons: Call Emergency & Get Help |
| `/situation` | Describe emergency with voice/text + scenario selection |
| `/guidance` | Step-by-step AI instructions with voice playback |
| `/dashboard/medical` | Medical responder dashboard |
| `/dashboard/police` | Police responder dashboard |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analyze` | POST | AI analysis of emergency situation |
| `/api/incidents` | GET/POST | Incident CRUD operations |
| `/api/livekit-token` | POST | Generate LiveKit voice tokens |

## Demo Flow

1. Open the app at `/`
2. Click "What should I do?"
3. Select emergency type (Medical/Fire/Safety)
4. Describe: "My father collapsed and is not breathing"
5. Click "Get Instructions"
6. Follow step-by-step guidance
7. Incident appears in Medical Dashboard

## Environment Variables

```env
# Required
OPENAI_API_KEY=your_openai_api_key

# Optional (for voice communication)
LIVEKIT_API_KEY=your_livekit_key
LIVEKIT_API_SECRET=your_livekit_secret
LIVEKIT_URL=wss://your-server.livekit.cloud
```

## AI Behavior

The AI is designed to be:
- ✅ Calm and professional
- ✅ Short, direct instructions
- ✅ Safety-first focused
- ✅ Never authoritative/diagnostic
- ✅ Always recommends calling emergency services

## License

MIT
