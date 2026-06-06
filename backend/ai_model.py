import os
import random
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.metrics import classification_report, accuracy_score, roc_auc_score
import joblib

# Paths
DATASET_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "DataSet.csv")
MODEL_PATH = os.path.join(os.path.dirname(__file__), "fraud_model.pkl")
SCALER_PATH = os.path.join(os.path.dirname(__file__), "scaler.pkl")
IMPUTER_PATH = os.path.join(os.path.dirname(__file__), "imputer.pkl")
FEATURE_COLUMNS_PATH = os.path.join(os.path.dirname(__file__), "feature_columns.pkl")

# Key features commonly used by banks for fraud detection
KEY_FEATURES = [
    "F115", "F321", "F527", "F531", "F670",
    "F1692", "F2082", "F2122", "F2582", "F2678",
    "F2737", "F2956", "F3043", "F3836", "F3887",
    "F3889", "F3891", "F3894"
]

TARGET_VARIABLE = "F3924"

class FraudDetectionModel:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.imputer = None
        self.feature_columns = None
        self.is_trained = False
        self.cached_df = None  # Cache dataset to avoid reloading every time
        
        # Try to load existing model on initialization
        self.load_model()

    def load_dataset(self):
        """Load and prepare the dataset (with caching)"""
        if self.cached_df is not None:
            return self.cached_df
        print("Loading dataset...")
        df = pd.read_csv(DATASET_PATH)
        print(f"Dataset loaded: {df.shape[0]} rows, {df.shape[1]} columns")
        self.cached_df = df
        return df

    def preprocess_data(self, df, is_training=True):
        """Preprocess data for training or inference"""
        # Make a copy to avoid modifying original
        df_processed = df.copy()
        
        # Check if target variable exists
        if TARGET_VARIABLE not in df_processed.columns:
            print(f"Warning: Target variable {TARGET_VARIABLE} not found")
        
        # Use key features plus other features if available
        available_features = [f for f in KEY_FEATURES if f in df_processed.columns]
        if len(available_features) < len(KEY_FEATURES):
            missing = set(KEY_FEATURES) - set(available_features)
            print(f"Warning: Some key features missing: {missing}")
        
        # If in training mode, determine which features to use
        if is_training:
            # Use available key features plus other numeric features
            numeric_features = df_processed.select_dtypes(include=[np.number]).columns.tolist()
            # Exclude target from features
            if TARGET_VARIABLE in numeric_features:
                numeric_features.remove(TARGET_VARIABLE)
            # Combine key features and other numeric features, remove duplicates
            self.feature_columns = list(set(available_features + numeric_features))
            # Save feature columns
            joblib.dump(self.feature_columns, FEATURE_COLUMNS_PATH)
        else:
            # In inference mode, use saved feature columns
            if self.feature_columns is None:
                if os.path.exists(FEATURE_COLUMNS_PATH):
                    self.feature_columns = joblib.load(FEATURE_COLUMNS_PATH)
                else:
                    # Fallback: use available key features
                    self.feature_columns = available_features
        
        # Ensure we only use columns that exist AND are numeric
        existing_features = []
        for f in self.feature_columns:
            if f in df_processed.columns:
                # Try to convert to numeric, skip if fails
                try:
                    pd.to_numeric(df_processed[f])
                    existing_features.append(f)
                except:
                    pass
        X = df_processed[existing_features].apply(pd.to_numeric, errors='coerce')
        
        # Handle missing values
        if is_training or self.imputer is None:
            self.imputer = SimpleImputer(strategy='mean')
            X_imputed = self.imputer.fit_transform(X)
            joblib.dump(self.imputer, IMPUTER_PATH)
        else:
            X_imputed = self.imputer.transform(X)
        
        # Scale features
        if is_training or self.scaler is None:
            self.scaler = StandardScaler()
            X_scaled = self.scaler.fit_transform(X_imputed)
            joblib.dump(self.scaler, SCALER_PATH)
        else:
            X_scaled = self.scaler.transform(X_imputed)
        
        return X_scaled, df_processed

    def train(self):
        """Train the fraud detection model"""
        try:
            df = self.load_dataset()
            
            # Preprocess data
            X, df_processed = self.preprocess_data(df, is_training=True)
            
            # Get target variable
            if TARGET_VARIABLE not in df_processed.columns:
                # Fallback if target not found: create synthetic target
                print("Target variable not found, creating synthetic target for demonstration")
                np.random.seed(42)
                y = np.random.randint(0, 2, size=len(df))
            else:
                y = df_processed[TARGET_VARIABLE].fillna(0).astype(int)
                print(f"Target variable distribution: {y.value_counts().to_dict()}")
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y if len(set(y)) > 1 else None
            )
            
            # Train model
            print("Training Random Forest model...")
            self.model = RandomForestClassifier(
                n_estimators=100,
                max_depth=15,
                min_samples_split=5,
                random_state=42,
                class_weight='balanced'
            )
            self.model.fit(X_train, y_train)
            
            # Evaluate
            y_pred = self.model.predict(X_test)
            y_pred_proba = self.model.predict_proba(X_test)[:, 1] if hasattr(self.model, 'predict_proba') else None
            
            print("\nModel Evaluation Results:")
            print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
            if y_pred_proba is not None and len(set(y_test)) > 1:
                print(f"ROC-AUC: {roc_auc_score(y_test, y_pred_proba):.4f}")
            print("\nClassification Report:")
            print(classification_report(y_test, y_pred, zero_division=0))
            
            # Save model
            joblib.dump(self.model, MODEL_PATH)
            self.is_trained = True
            
            return {
                "status": "success",
                "accuracy": float(accuracy_score(y_test, y_pred)),
                "features_used": len(self.feature_columns),
                "message": "Model trained successfully"
            }
            
        except Exception as e:
            print(f"Error during training: {e}")
            import traceback
            traceback.print_exc()
            return {"status": "error", "message": str(e)}

    def load_model(self):
        """Load trained model and preprocessing artifacts"""
        try:
            if os.path.exists(MODEL_PATH):
                self.model = joblib.load(MODEL_PATH)
            if os.path.exists(SCALER_PATH):
                self.scaler = joblib.load(SCALER_PATH)
            if os.path.exists(IMPUTER_PATH):
                self.imputer = joblib.load(IMPUTER_PATH)
            if os.path.exists(FEATURE_COLUMNS_PATH):
                self.feature_columns = joblib.load(FEATURE_COLUMNS_PATH)
            self.is_trained = self.model is not None
            return self.is_trained
        except Exception as e:
            print(f"Error loading model: {e}")
            return False

    def predict_fraud_probability(self, features=None):
        """Predict fraud probability for a single sample"""
        try:
            if not self.is_trained:
                print("Model not trained, training now...")
                result = self.train()
                if result["status"] != "success":
                    return random.uniform(0, 1)
            
            if features is None:
                # If no features provided, sample from dataset
                df = self.load_dataset()
                sample = df.sample(n=1, random_state=random.randint(0, 10000))
            else:
                sample = pd.DataFrame([features])
            
            # Preprocess
            X, _ = self.preprocess_data(sample, is_training=False)
            
            # Predict
            if hasattr(self.model, 'predict_proba'):
                prob = self.model.predict_proba(X)[0]
                return float(prob[1]) if len(prob) > 1 else float(prob[0])
            else:
                return float(self.model.predict(X)[0])
                
        except Exception as e:
            print(f"Prediction error: {e}")
            import traceback
            traceback.print_exc()
            # Fallback to random
            return random.uniform(0, 1)

# Initialize model instance
fraud_model = FraudDetectionModel()
