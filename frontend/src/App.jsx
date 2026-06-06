import { useState, useEffect, useRef } from 'react'
import { Shield, Activity, AlertTriangle, CheckCircle, Zap, TrendingUp, Clock, Database, Users, AlertOctagon, FileText, Server, RefreshCw, Plus, Settings, TrendingDown, X, Eye } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

function App() {
  const [alerts, setAlerts] = useState([])
  const [connected, setConnected] = useState(false)
  const [lastScore, setLastScore] = useState(0.5)
  const [highRiskAccounts, setHighRiskAccounts] = useState([])
  const [fetchError, setFetchError] = useState(null)
  const [featureImportance, setFeatureImportance] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState(null)
  const wsRef = useRef(null)

  // Use environment variables for production, localhost for development
  const API_BASE_URL = import.meta.env.PROD 
    ? import.meta.env.VITE_API_URL 
    : 'http://127.0.0.1:8000'
  
  const WS_URL = import.meta.env.PROD 
    ? import.meta.env.VITE_WS_URL 
    : 'ws://127.0.0.1:8000/ws/alerts'

  const fetchHighRiskAccounts = async () => {
    setIsLoading(true)
    try {
      const url = `${API_BASE_URL}/high-risk-accounts`
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
      })
      const data = await response.json()
      setHighRiskAccounts(data)
      setFetchError(null)
    } catch (e) {
      console.error("Error fetching high risk accounts:", e)
      setFetchError(e.message)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchFeatureImportance = async () => {
    try {
      const url = `${API_BASE_URL}/model/feature-importance`
      const response = await fetch(url)
      const data = await response.json()
      if (data.status === "success") {
        setFeatureImportance(data.feature_importance)
      }
    } catch (e) {
      console.error("Error fetching feature importance:", e)
    }
  }

  const trainModel = async () => {
    try {
      await fetch(`${API_BASE_URL}/train-model`, { method: 'POST' })
      await fetchFeatureImportance()
    } catch (e) {
      console.error('Error training model:', e)
    }
  }

  const generateTestTransactions = async () => {
    try {
      await fetch(`${API_BASE_URL}/test/generate-transactions?num=20`, { method: 'POST' })
      await fetchHighRiskAccounts()
    } catch (e) {
      console.error('Error generating test transactions:', e)
    }
  }

  // Fetch high risk accounts periodically
  useEffect(() => {
    // Clear old alerts on start to remove stale data
    setAlerts([])
    fetchHighRiskAccounts()
    fetchFeatureImportance()
    const interval = setInterval(fetchHighRiskAccounts, 10000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    let reconnectTimeout;

    const connect = () => {
      // Clean up any existing connection first
      if (wsRef.current) {
        wsRef.current.close();
      }

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Add unique id to prevent key warnings
          const alertWithId = {
            ...data,
            id: `${data.timestamp}-${Date.now()}-${Math.random()}`
          }
          setLastScore(data.score);
          setAlerts((prev) => [alertWithId, ...prev].slice(0, 20));
        } catch (e) {
          console.error("Error parsing WebSocket message:", e);
        }
      };

      ws.onclose = (event) => {
        console.log("WebSocket closed, reconnecting...", event);
        setConnected(false);
        // Reconnect with exponential backoff
        reconnectTimeout = setTimeout(connect, 3000);
      };

      ws.onerror = (error) => {
        console.log("WebSocket minor connection event - will auto-reconnect");
        // Don't log as error - it's a normal event
      };
    };

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Critical':
        return 'text-power-gold border-power-gold'
      case 'Warning':
        return 'text-power-cyan border-power-cyan'
      default:
        return 'text-green-400 border-green-400'
    }
  }

  const getStatusBg = (status) => {
    switch (status) {
      case 'Critical':
        return 'bg-power-gold/10'
      case 'Warning':
        return 'bg-power-cyan/10'
      default:
        return 'bg-green-400/10'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Critical':
        return <AlertTriangle className="w-6 h-6" />
      case 'Warning':
        return <Activity className="w-6 h-6" />
      default:
        return <CheckCircle className="w-6 h-6" />
    }
  }

  const getRiskLevelColor = (level) => {
    switch (level) {
      case 'critical': return 'text-red-400'
      case 'high': return 'text-orange-400'
      case 'medium': return 'text-yellow-400'
      default: return 'text-green-400'
    }
  }

  return (
    <div className="min-h-screen bg-power-black text-white p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-10">
          <Shield className="w-10 h-10 text-power-cyan" />
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-power-cyan to-power-gold bg-clip-text text-transparent">
              CipherVault AI
            </h1>
            <p className="text-gray-400 text-sm">AI-Powered Real-time Fraud Detection System</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => {
                fetchHighRiskAccounts()
                fetchFeatureImportance()
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={generateTestTransactions}
              className="flex items-center gap-2 px-4 py-2 bg-power-cyan/20 text-power-cyan hover:bg-power-cyan/30 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Simulate Transactions
            </button>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
              <span className="text-xs text-gray-400">{connected ? 'WebSocket Connected' : 'Reconnecting...'}</span>
            </div>
          </div>
        </div>

        {fetchError && (
          <div className="bg-red-900/50 border border-red-500 rounded-xl p-4 mb-4 flex items-center justify-between">
            <p className="text-red-400">Fetch Error: {fetchError}</p>
            <button onClick={fetchHighRiskAccounts} className="text-red-300 hover:text-white">
              Retry
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-gray-900 to-power-black border border-gray-800 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-power-cyan/10 rounded-xl">
                <Activity className="w-6 h-6 text-power-cyan" />
              </div>
              <span className="text-xs text-gray-400">Live</span>
            </div>
            <motion.div key={lastScore} initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ duration: 0.3 }}>
              <p className="text-4xl font-bold text-power-cyan">{(lastScore * 100).toFixed(1)}%</p>
            </motion.div>
            <p className="text-gray-400 mt-2">Entropy Score</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-gray-900 to-power-black border border-gray-800 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-power-gold/10 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-power-gold" />
              </div>
            </div>
            <p className="text-4xl font-bold text-power-gold">
              {alerts.filter(a => a.status === 'Critical').length}
            </p>
            <p className="text-gray-400 mt-2">Critical Alerts</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-gray-900 to-power-black border border-gray-800 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-500/10 rounded-xl">
                <Users className="w-6 h-6 text-red-400" />
              </div>
            </div>
            <p className="text-4xl font-bold text-red-400">
              {highRiskAccounts.length}
            </p>
            <p className="text-gray-400 mt-2">High Risk Accounts</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-gray-900 to-power-black border border-gray-800 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/10 rounded-xl">
                <Shield className="w-6 h-6 text-green-400" />
              </div>
            </div>
            <p className="text-4xl font-bold text-green-400">
              {alerts.filter(a => a.status === 'Normal').length}
            </p>
            <p className="text-gray-400 mt-2">Safe Transactions</p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 bg-gradient-to-br from-gray-900 to-power-black border border-gray-800 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-power-cyan" />
                <h2 className="text-xl font-semibold">Live Alert Feed</h2>
              </div>
              <span className="text-xs text-gray-500">Last {alerts.length} alerts</span>
            </div>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              <AnimatePresence>
                {alerts.map((alert, index) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className={`border-l-4 ${getStatusColor(alert.status)} ${getStatusBg(alert.status)} rounded-lg p-4`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={getStatusColor(alert.status)}>
                          {getStatusIcon(alert.status)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-semibold ${alert.status === 'Critical' ? 'text-power-gold' : alert.status === 'Warning' ? 'text-power-cyan' : 'text-green-400'}`}>
                              {alert.status}
                            </span>
                            {alert.ai_powered && (
                              <span className="bg-power-cyan/20 text-power-cyan text-xs px-2 py-0.5 rounded-full font-medium">
                                AI
                              </span>
                            )}
                            <span className="text-gray-500 text-xs">#{alert.timestamp}</span>
                            {alert.status === 'Critical' && alert.blacklist_matches > 0 && (
                              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                                AUTO-FROZEN
                              </span>
                            )}
                            {alert.status === 'Warning' && (
                              <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded-full font-medium">
                                FLAG & HOLD
                              </span>
                            )}
                          </div>
                          <p className="text-gray-400 text-sm mt-1">
                            Entropy Score: <span className="font-mono text-white">{(alert.score * 100).toFixed(2)}%</span>
                          </p>
                          <div className="flex gap-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(alert.timestamp * 1000).toLocaleTimeString()}</span>
                            <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Velocity: {alert.velocity}</span>
                            <span className="flex items-center gap-1"><Database className="w-3 h-3" /> Blacklists: {alert.blacklist_matches}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {alerts.length === 0 && (
                <div className="text-center py-10 text-gray-500">
                  <Activity className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p>Waiting for alerts...</p>
                </div>
              )}
            </div>
          </motion.div>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-br from-gray-900 to-power-black border border-gray-800 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-red-400" />
                  <h2 className="text-xl font-semibold">High Risk Mule Accounts</h2>
                </div>
                <button
                  onClick={fetchHighRiskAccounts}
                  className="p-1 hover:bg-gray-800 rounded"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <div className="space-y-4 max-h-[300px] overflow-y-auto">
                {highRiskAccounts.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <p className="text-sm">No high risk accounts detected</p>
                  </div>
                ) : (
                  highRiskAccounts.map((account, idx) => (
                    <motion.div
                      key={account.account_id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`p-4 rounded-lg border cursor-pointer hover:bg-gray-800/50 transition-colors ${
                        account.status === 'FROZEN - AUTO' ? 'border-power-gold/50 bg-power-gold/10' :
                        account.risk_level === 'critical' ? 'border-red-500/50 bg-red-500/10' :
                        account.risk_level === 'high' ? 'border-orange-500/50 bg-orange-500/10' :
                        'border-yellow-500/50 bg-yellow-500/10'
                      }`}
                      onClick={() => {
                        setSelectedAccount(account)
                        setShowModal(true)
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-mono text-sm text-white">
                          {account.account_id?.slice(0, 6) || 'ACC'}...{account.account_id?.slice(-4) || '0000'}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          account.status === 'FROZEN - AUTO' ? 'bg-power-gold text-black' :
                          account.risk_level === 'critical' ? 'bg-red-500 text-white' :
                          account.risk_level === 'high' ? 'bg-orange-500 text-white' :
                          'bg-yellow-500 text-black'
                        }`}>
                          {account.status || account.risk_level?.toUpperCase() || 'MONITORED'}
                        </span>
                      </div>
                      <div className={`text-sm font-semibold mb-1 ${getRiskLevelColor(account.risk_level)}`}>
                        Risk Score: {(account.risk_score * 100).toFixed(1)}%
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {account.risk_factors?.slice(0, 2).map((factor, i) => (
                          <span key={i} className="text-xs text-gray-400 bg-gray-800/50 px-1.5 py-0.5 rounded">
                            {factor.split(':')[0]}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-gradient-to-br from-gray-900 to-power-black border border-gray-800 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-power-gold" />
                  <h2 className="text-xl font-semibold">System Status</h2>
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">Backend API</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                      <span className="text-green-400 text-sm">Online</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">WebSocket</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`}></div>
                      <span className={connected ? 'text-green-400 text-sm' : 'text-yellow-400 text-sm'}>
                        {connected ? 'Connected' : 'Connecting'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertOctagon className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">Fraud Engine</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                      <span className="text-green-400 text-sm">Active</span>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={trainModel}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-power-cyan/20 text-power-cyan hover:bg-power-cyan/30 rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
                Retrain Model
              </button>
            </motion.div>
          </div>
        </div>

        {featureImportance && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-gradient-to-br from-gray-900 to-power-black border border-gray-800 rounded-2xl p-6"
          >
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-power-cyan" />
              Top Feature Importance
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {featureImportance.slice(0, 8).map((item, idx) => (
                <div key={item.feature} className="bg-gray-800/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm text-gray-300">{item.feature}</span>
                    <span className="text-xs text-gray-500">#{idx + 1}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                    <div
                      className="bg-power-cyan h-2 rounded-full"
                      style={{ width: `${item.importance * 1000}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-400">{item.importance.toFixed(4)}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {showModal && selectedAccount && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-lg w-full mx-4"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Eye className="w-5 h-5 text-power-cyan" />
                  Account Details
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 hover:bg-gray-800 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-500 text-sm mb-1">Account ID</p>
                  <p className="font-mono text-lg">{selectedAccount.account_id}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm mb-1">Risk Score</p>
                  <p className={`text-2xl font-bold ${getRiskLevelColor(selectedAccount.risk_level)}`}>
                    {(selectedAccount.risk_score * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm mb-1">Status</p>
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                    selectedAccount.status === 'FROZEN - AUTO' ? 'bg-power-gold text-black' :
                    selectedAccount.risk_level === 'critical' ? 'bg-red-500 text-white' :
                    selectedAccount.risk_level === 'high' ? 'bg-orange-500 text-white' :
                    'bg-yellow-500 text-black'
                  }`}>
                    {selectedAccount.status || selectedAccount.risk_level?.toUpperCase() || 'MONITORED'}
                  </span>
                </div>
                <div>
                  <p className="text-gray-500 text-sm mb-2">Risk Factors</p>
                  <div className="space-y-2">
                    {selectedAccount.risk_factors?.map((factor, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                        <AlertTriangle className="w-4 h-4 mt-0.5 text-yellow-500" />
                        {factor}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-full mt-6 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App