import random
from datetime import datetime
from models import Transaction

def generate_test_transactions(num_transactions=20):
    """Generate sample transactions for testing"""
    accounts = [f"ACC-{random.randint(1000, 9999)}" for _ in range(10)]
    transactions = []
    
    for i in range(num_transactions):
        from_acc = random.choice(accounts)
        to_acc = random.choice([acc for acc in accounts if acc != from_acc])
        
        transaction = Transaction(
            transaction_id=f"TXN-{datetime.now().strftime('%Y%m%d%H%M%S')}-{i}",
            from_account=from_acc,
            to_account=to_acc,
            amount=round(random.uniform(100, 50000), 2),
            channel=random.choice(["online", "mobile", "ATM", "wire"]),
            transaction_type=random.choice(["transfer", "deposit", "withdrawal"])
        )
        transactions.append(transaction)
    
    return transactions
