# 🎬 Clip Aura — AI Viral Clip Engine

![Clip Aura Banner](https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1000&auto=format&fit=crop)

**Clip Aura** is a high-performance, open-source AI video clipping engine that transforms long-form content (podcasts, streams, interviews) into viral short-form clips for TikTok, Reels, and YouTube Shorts. 

Built with **FastAPI**, **Celery**, **Whisper**, and **LLaMA 3**, it handles the entire pipeline: from URL downloading and AI transcription to face-tracking crops and animated "Typography Motion" captions.

---

## ✨ Key Features

- **🎯 AI Viral Moment Detection**: LLaMA 3.1 analyzes transcripts to find the most "hook-worthy" and shareable segments automatically.
- **📐 Dynamic Face-Tracking**: AI detects faces and automatically crops landscape video into 9:16 vertical format while keeping the speaker centered.
- **✨ Animated Typography Captions**: Word-by-word "Karaoke style" captions with cursive emphasis and power-word highlighting.
- **🔗 Universal Import**: Supports YouTube, Twitch, Vimeo, X (Twitter), and 1000+ sites via `yt-dlp`.
- **🏗️ Industrial SaaS Stack**: Distributed background processing with Docker, Redis, and Celery for maximum scalability.
- **💳 Commercial Ready**: Integrated Supabase Auth, Usage Credit system, and Stripe Webhook support.

---

## 🛠️ Technology Stack

| Component | Technology |
| :--- | :--- |
| **Backend** | Python, FastAPI |
| **Task Queue** | Celery, Redis |
| **AI Transcription** | OpenAI Whisper (via Groq) |
| **Viral Analysis** | LLaMA 3.1 70B / 8B |
| **Video Processing** | FFmpeg, OpenCV, MediaPipe |
| **Auth & DB** | Supabase, SQLAlchemy, SQLite |
| **Deployment** | Docker, Docker Compose |

---

## 🚀 Quick Start (Local Setup)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/Clip-Aura.git
cd Clip-Aura
```

### 2. Configure Environment
Create a `.env` file from the template and add your API keys:
```bash
cp .env.example .env
```
*Required: `GROQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`.*

### 3. Launch with Docker
```bash
docker-compose up --build
```
The app will be live at **[http://localhost:8000](http://localhost:8000)**.

---

## 📁 Project Structure

```text
Clip-Aura/
├── app/
│   ├── api/          # FastAPI Routes, Auth, Database Models
│   ├── core/         # AI Logic (Clipping, Tracking, Transcription)
│   ├── worker/        # Celery Task Definitions
│   └── config.py     # Global Settings & Caption Styles
├── static/           # Premium Frontend (JS/CSS/HTML)
├── tests/            # Automated Pipeline Tests
├── Dockerfile        # Container Configuration
└── docker-compose.yml # Service Orchestration
```

---

## 📜 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 🙌 Credits
- **AI Engine**: Powered by Groq (Whisper + LLaMA)
- **Face Tracking**: MediaPipe by Google
- **Typography**: Montserrat & Inter via Google Fonts
