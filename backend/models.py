from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class Transaction(BaseModel):
    transaction_id: str
    from_account: str
    to_account: str
    amount: float
    currency: str = "USD"
    timestamp: datetime = datetime.now()
    channel: str  # e.g., "online", "mobile", "ATM", "wire"
    transaction_type: str  # e.g., "transfer", "deposit", "withdrawal"
    metadata: Optional[Dict[str, Any]] = None

class FraudAlert(BaseModel):
    alert_id: str
    source_system: str  # e.g., "TMS", "fraud_monitoring", "govt_cyber"
    severity: str  # "low", "medium", "high", "critical"
    timestamp: datetime = datetime.now()
    description: str
    related_accounts: List[str] = []
    related_transactions: List[str] = []
    metadata: Optional[Dict[str, Any]] = None

class MuleAccountRisk(BaseModel):
    account_id: str
    risk_score: float
    risk_factors: List[str]
    risk_level: str  # "low", "medium", "high", "critical"
    last_updated: datetime = datetime.now()
    related_alerts: List[str] = []
