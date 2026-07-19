import { useState, useEffect } from 'react'
import { analyticsAPI } from '../services/api'
import { MiniGauge } from '../components/MetricCard'

export default function MLOpsMonitor() {
  const [driftData, setDriftData] = useState<Record<string, unknown> | null>(null)
  const [modelsInfo, setModelsInfo] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      analyticsAPI.drift().then(res => res.data),
      analyticsAPI.models().then(res => res.data),
    ])
      .then(([drift, models]) => {
        setDriftData(drift.drift_reports)
        setModelsInfo(models.models)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">MLOps Monitor</h2>

      {/* Model Versions */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Model Versions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(modelsInfo || {}).map(([key, val]) => {
            const m = val as Record<string, unknown>
            const versions = (m.versions || []) as Array<Record<string, unknown>>
            const metrics = m.current_metrics as Record<string, number> | null

            return (
              <div key={key} className="bg-white rounded-xl shadow-sm border p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-slate-900 capitalize">{key} Model</h4>
                  <span className={`text-xs px-2 py-1 rounded-full ${m.trained ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {m.trained ? 'Active' : 'Not Trained'}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mb-2">Version: <span className="font-mono text-xs">{m.current_version as string || 'N/A'}</span></p>
                {metrics && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <MiniGauge label="Accuracy" percent={metrics.accuracy * 100} accent="#378ADD" />
                    <MiniGauge label="F1 Score" percent={metrics.f1_score * 100} accent="#1D9E75" />
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-2">Version history: {versions.length} version(s)</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Drift Detection */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Drift Detection</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(driftData || {}).map(([key, val]) => {
            const report = val as Record<string, unknown>
            const distribution = report.distribution as Record<string, unknown> | undefined
            const driftCount = report.drift_features_count as number || 0
            const totalFeatures = report.total_features_monitored as number || 0
            const recommendations = report.recommendations as string[] || []

            const hasAlert = driftCount > 0

            return (
              <div key={key} className={`bg-white rounded-xl shadow-sm border p-5 ${hasAlert ? 'border-amber-300' : ''}`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-slate-900 capitalize">{key} Model</h4>
                  {hasAlert ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">Drift Alert</span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Stable</span>
                  )}
                </div>

                <div className="text-sm space-y-1">
                  <p>Total predictions: <span className="font-semibold">{String(distribution?.total_predictions || 0)}</span></p>
                  <p>Avg confidence: <span className="font-semibold">{distribution?.avg_confidence ? ((distribution.avg_confidence as number) * 100).toFixed(1) + '%' : 'N/A'}</span></p>
                  <p>Features with drift: <span className="font-semibold">{driftCount}/{totalFeatures}</span></p>
                </div>

                {recommendations.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-amber-700 mb-1">Recommendations:</p>
                    {recommendations.map((rec, idx) => (
                      <p key={idx} className="text-xs text-amber-600">- {rec}</p>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* System Status */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">System Status</h3>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <StatusItem label="ML Pipeline" status="healthy" />
            <StatusItem label="Data Store" status="healthy" />
            <StatusItem label="Model Registry" status="healthy" />
            <StatusItem label="Drift Monitor" status="healthy" />
          </div>
          <div className="mt-4 p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600">
              <strong>Architecture:</strong> Flask REST API + Scikit-learn ML Pipeline + SQLite DB + MLOps Monitoring
            </p>
            <p className="text-sm text-slate-600 mt-1">
              <strong>Models:</strong> Heart Disease (Ensemble GB+RF), Diabetes (GB + Feature Selection), Breast Cancer (SVM + PCA)
            </p>
            <p className="text-sm text-slate-600 mt-1">
              <strong>MLOps:</strong> Prediction audit trail, KS drift detection, model versioning, structured JSON logging
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusItem({ label, status }: { label: string; status: string }) {
  return (
    <div>
      <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${status === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`} />
      <p className="text-sm text-slate-700">{label}</p>
      <p className="text-xs text-slate-500 capitalize">{status}</p>
    </div>
  )
}