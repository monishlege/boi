# CipherVault AI

An AI-powered real-time fraud detection and mule account prevention system with FastAPI backend and React frontend.

## Problem Statement Solution

This solution addresses:
- ✅ **Suspicious transaction detection** using AI trained on your dataset
- ✅ **Mule account identification** through behavioral pattern analysis
- ✅ **Multi-source data ingestion**:
  - Financial transactions (cross-channel)
  - Fraud monitoring system alerts
  - Transaction Monitoring System (TMS) alerts
  - Government cyber fraud alerts/tickets
- ✅ **Real-time risk assessment and alerting**
- ✅ **Preventing fraudulent fund circulation** via early detection

## Dataset Information

The AI model uses:
- **Target Variable**: `F3924` - indicates fraudulent/mule accounts
- **Key Features**: 18 bank-recommended features for fraud detection:
  ```
  F115, F321, F527, F531, F670, F1692,
  F2082, F2122, F2582, F2678, F2737, F2956,
  F3043, F3836, F3887, F3889, F3891, F3894
  ```

## Project Structure

```
BOI/
├── backend/
│   ├── main.py                 # FastAPI app with all endpoints
│   ├── fraud_engine.py         # AI-powered fraud score calculation
│   ├── ai_model.py             # ML model training and inference
│   ├── mule_detection.py       # Mule account risk assessment
│   ├── models.py               # Pydantic data models
│   ├── generate_test_data.py   # Test data generation
│   └── requirements.txt        # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # Main React component with mule account UI
│   │   ├── main.jsx            # React entry point
│   │   └── index.css           # Tailwind CSS styles
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
├── DataSet.csv                 # Your fraud dataset
└── README.md
```

## API Endpoints

### Core Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/train-model` | Train/re-train the AI model |
| GET | `/model/feature-importance` | Get top 20 important features |
| GET | `/ws/alerts` | WebSocket for real-time fraud alerts |

### Transaction & Alert Ingestion
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ingest-transaction` | Ingest a new financial transaction |
| POST | `/ingest-fraud-alert` | Ingest fraud alerts from TMS, monitoring systems, or government |

### Risk Assessment
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/mule-risk/{account_id}` | Get mule account risk for specific account |
| GET | `/high-risk-accounts` | List all medium/high/critical risk accounts |
| POST | `/test/generate-transactions` | Generate test transactions to see mule detection in action |

## Deployment Steps

### Important: DataSet.csv
The `DataSet.csv` file is too large for GitHub and is not included in the repo. You'll need to:
1. Upload it to your Render instance separately OR
2. Use Render's "Disk" feature to persist it OR
3. Update the ai_model.py to load data from another source

### Backend Deployment on Render
We've already created `render.yaml` for auto-deployment!

1. **Go to Render > New > Blueprint**
2. **Connect your GitHub repository**
3. **Deploy!**

Or manually:
1. **Create a new Web Service** on Render
2. **Connect your repository**
3. **Configure the service**:
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python main.py`
4. **Add Environment Variables** (optional):
   - `FRONTEND_URL`: Your Vercel production URL (e.g., `https://ciphervault-ai.vercel.app`)

### Frontend Deployment on Vercel
We've already created `vercel.json` for auto-deployment!

1. **Import your project** on Vercel
2. **Configure Environment Variables**:
   - `VITE_API_URL`: Your Render backend URL (e.g., `https://ciphervault-ai-backend.onrender.com`)
   - `VITE_WS_URL`: Your Render backend WebSocket URL (e.g., `wss://ciphervault-ai-backend.onrender.com/ws/alerts`)
3. **Deploy!**

### After Deployment
1. Once your Render backend is deployed, update:
   - `frontend/.env.production` with your actual backend URL
   - `vercel.json` with your actual backend URL
   - And commit these changes!

## Local Development

### Backend
```bash
cd backend
pip install -r requirements.txt
python main.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Testing the System

1. **Start both services** (backend on http://localhost:8000, frontend on http://localhost:5173)
2. **Generate test transactions**:
   ```bash
   curl -X POST "http://localhost:8000/test/generate-transactions?num=50"
   ```
3. **Check the frontend** - you'll see real-time fraud alerts and high-risk mule accounts!
4. **Train the AI model** (if not done automatically):
   ```bash
   curl -X POST http://localhost:8000/train-model
   ```

## Key Features

- 🤖 **AI-Powered Detection**: Random Forest classifier trained on your dataset
- 🔍 **Mule Account Detection**: Analyzes transaction velocity, turnover patterns, and behavioral traits
- 📊 **Multi-Source Ingestion**: Support for transactions, TMS alerts, and government fraud tickets
- ⚡ **Real-Time Alerts**: WebSocket-based live alert feed
- 🎨 **Beautiful UI**: Professional "Power Professional" theme with Tailwind CSS
- 📈 **Risk Scoring**: 0-100% risk score with clear risk level categorization
