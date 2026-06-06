import os
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from fraud_engine import generate_alert
from ai_model import fraud_model
from models import Transaction, FraudAlert, MuleAccountRisk
from mule_detection import mule_detector
from generate_test_data import generate_test_transactions
import threading
from typing import List
from fraud_engine import high_risk_accounts

load_dotenv()

app = FastAPI(title="CipherVault AI API")

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://guardian-protocol.vercel.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
    expose_headers=["*"],  # Expose all headers
)

@app.on_event("startup")
async def startup_event():
    # Try to load model on startup, train if not available
    def train_model_background():
        try:
            if not fraud_model.load_model():
                print("Training AI model on startup...")
                fraud_model.train()
        except Exception as e:
            print(f"Error during startup model training: {e}")
    
    # Run in background thread to not block startup
    thread = threading.Thread(target=train_model_background)
    thread.start()

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "CipherVault AI"}

@app.post("/train-model")
async def train_model_endpoint():
    try:
        result = fraud_model.train()
        return result
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/model/feature-importance")
async def get_feature_importance():
    """Get top important features from the trained model"""
    try:
        if not fraud_model.is_trained:
            return {"status": "error", "message": "Model not trained yet"}
        
        if hasattr(fraud_model.model, 'feature_importances_'):
            importances = fraud_model.model.feature_importances_
            feature_names = fraud_model.feature_columns[:len(importances)]
            
            # Create sorted list
            feature_importance = sorted(
                zip(feature_names, importances),
                key=lambda x: x[1],
                reverse=True
            )
            
            return {
                "status": "success",
                "feature_importance": [
                    {"feature": f, "importance": float(i)}
                    for f, i in feature_importance[:20]
                ]
            }
        else:
            return {"status": "error", "message": "Model doesn't support feature importance"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# --- Transaction Ingestion Endpoint ---
@app.post("/ingest-transaction")
async def ingest_transaction(transaction: Transaction):
    """Ingest a new transaction for analysis"""
    try:
        mule_detector.record_transaction(transaction)
        # Assess risk for both accounts involved
        from_risk = mule_detector.assess_mule_risk(transaction.from_account)
        to_risk = mule_detector.assess_mule_risk(transaction.to_account)
        
        return {
            "status": "success",
            "transaction_id": transaction.transaction_id,
            "from_account_risk": from_risk,
            "to_account_risk": to_risk
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

# --- Fraud Alert Ingestion Endpoint ---
@app.post("/ingest-fraud-alert")
async def ingest_fraud_alert(alert: FraudAlert):
    """Ingest fraud alerts from any source (TMS, fraud monitoring, govt cyber alerts)"""
    try:
        # Update risk for related accounts
        for account_id in alert.related_accounts:
            risk = mule_detector.assess_mule_risk(account_id)
            if alert.severity in ["high", "critical"]:
                risk.risk_score = min(risk.risk_score + 0.2, 1.0)
                risk.risk_factors.append(f"Linked to {alert.severity} fraud alert from {alert.source_system}")
        
        return {
            "status": "success",
            "alert_id": alert.alert_id,
            "message": "Fraud alert ingested successfully"
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

# --- Mule Account Risk Check Endpoint ---
@app.get("/mule-risk/{account_id}", response_model=MuleAccountRisk)
async def get_mule_risk(account_id: str):
    """Get current mule account risk assessment for a specific account"""
    try:
        risk = mule_detector.assess_mule_risk(account_id)
        return risk
    except Exception as e:
        return {"status": "error", "message": str(e)}

# --- Get All High Risk Accounts ---
@app.get("/high-risk-accounts")
async def get_high_risk_accounts():
    """Get all accounts with medium or higher risk, including auto-frozen ones"""
    try:
        # Combine from both sources: mule_detector and fraud_engine's high_risk_accounts
        accounts = []
        
        # Add from mule detector
        for risk in mule_detector.risk_cache.values():
            if risk.risk_level in ["medium", "high", "critical"]:
                accounts.append({
                    "account_id": risk.account_id,
                    "risk_score": risk.risk_score,
                    "risk_level": risk.risk_level,
                    "risk_factors": risk.risk_factors,
                    "status": "MONITORED"
                })
        
        # Add from fraud engine's auto-frozen accounts
        for account in high_risk_accounts:
            if account['account_id'] not in [a['account_id'] for a in accounts]:
                accounts.append(account)
        
        return sorted(accounts, key=lambda x: -x['risk_score'])
    except Exception as e:
        return []

# --- Test Endpoint: Generate Sample Transactions ---
@app.post("/test/generate-transactions")
async def generate_sample_transactions(num: int = 20):
    """Generate and ingest sample transactions for testing"""
    try:
        transactions = generate_test_transactions(num)
        results = []
        for txn in transactions:
            mule_detector.record_transaction(txn)
            from_risk = mule_detector.assess_mule_risk(txn.from_account)
            to_risk = mule_detector.assess_mule_risk(txn.to_account)
            results.append({
                "transaction_id": txn.transaction_id,
                "from_account": txn.from_account,
                "to_account": txn.to_account,
                "amount": txn.amount,
                "from_risk": from_risk,
                "to_risk": to_risk
            })
        
        return {
            "status": "success",
            "message": f"{num} test transactions generated and ingested",
            "results": results
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.websocket("/ws/alerts")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            try:
                alert = generate_alert()
                await websocket.send_json(alert)
                await asyncio.sleep(3)
            except Exception as e:
                print(f"WebSocket send error: {e}")
                break  # Exit loop if send fails (connection closed)
    except WebSocketDisconnect:
        print("WebSocket client disconnected")
    except Exception as e:
        print(f"WebSocket general error: {e}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
