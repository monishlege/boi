import random
from datetime import datetime, timedelta
from typing import Dict, List
from models import MuleAccountRisk

class MuleAccountDetector:
    def __init__(self):
        self.account_activity: Dict[str, List[Dict]] = {}
        self.risk_cache: Dict[str, MuleAccountRisk] = {}
        
    def record_transaction(self, transaction):
        """Record transaction for account activity tracking"""
        from_account = transaction.from_account
        to_account = transaction.to_account
        
        if from_account not in self.account_activity:
            self.account_activity[from_account] = []
        if to_account not in self.account_activity:
            self.account_activity[to_account] = []
            
        self.account_activity[from_account].append({
            "type": "outgoing",
            "amount": transaction.amount,
            "timestamp": transaction.timestamp
        })
        self.account_activity[to_account].append({
            "type": "incoming",
            "amount": transaction.amount,
            "timestamp": transaction.timestamp
        })
        
    def assess_mule_risk(self, account_id: str) -> MuleAccountRisk:
        """Assess mule account risk based on multiple factors"""
        risk_factors = []
        risk_score = 0.0
        activity = self.account_activity.get(account_id, [])
        
        if not activity:
            return MuleAccountRisk(
                account_id=account_id,
                risk_score=0.1,
                risk_factors=["No transaction history available"],
                risk_level="low"
            )
        
        # Factor 1: High transaction velocity
        last_hour = datetime.now() - timedelta(hours=1)
        recent_activity = [t for t in activity if t["timestamp"] > last_hour]
        if len(recent_activity) > 10:
            risk_score += 0.25
            risk_factors.append(f"High transaction velocity: {len(recent_activity)} transactions in last hour")
        
        # Factor 2: Quick turnover (incoming quickly followed by outgoing)
        incoming_timestamps = [t["timestamp"] for t in activity if t["type"] == "incoming"]
        outgoing_timestamps = [t["timestamp"] for t in activity if t["type"] == "outgoing"]
        quick_turnovers = 0
        for inc_time in incoming_timestamps[-10:]:
            for out_time in outgoing_timestamps[-10:]:
                if out_time > inc_time and (out_time - inc_time) < timedelta(minutes=30):
                    quick_turnovers += 1
        if quick_turnovers > 3:
            risk_score += 0.3
            risk_factors.append("Quick fund turnover detected")
        
        # Factor 3: Large number of unique counterparties
        # For demo, simulate with random factor
        if random.random() > 0.7:
            risk_score += 0.2
            risk_factors.append("Large number of unique transaction counterparties")
        
        # Factor 4: Round amount transactions
        round_amounts = [t for t in activity if t["amount"] % 1000 < 10]
        if len(round_amounts) > len(activity) * 0.4:
            risk_score += 0.15
            risk_factors.append("Unusual number of round-amount transactions")
        
        # Factor 5: Transaction patterns from govt alerts
        if random.random() > 0.8:
            risk_score += 0.3
            risk_factors.append("Matches patterns from government cyber fraud alerts")
        
        # Cap risk score at 1.0
        risk_score = min(risk_score, 1.0)
        
        # Determine risk level
        if risk_score > 0.8:
            risk_level = "critical"
        elif risk_score > 0.6:
            risk_level = "high"
        elif risk_score > 0.4:
            risk_level = "medium"
        else:
            risk_level = "low"
        
        risk_result = MuleAccountRisk(
            account_id=account_id,
            risk_score=round(risk_score, 4),
            risk_factors=risk_factors,
            risk_level=risk_level
        )
        
        self.risk_cache[account_id] = risk_result
        return risk_result


# Initialize detector
mule_detector = MuleAccountDetector()
