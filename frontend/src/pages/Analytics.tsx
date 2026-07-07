import { useState, useEffect } from 'react'
import { analyticsAPI } from '../services/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

export default function Analytics() {
  const [modelsData, setModelsData] = useState<Record<string, unknown> | null>(null)
  const [selectedModel, setSelectedModel] = useState('heart')
  const [evalData, setEvalData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    analyticsAPI.models()
      .then(res => setModelsData(res.data.models))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const loadEvaluation = (type: string) => {
    setSelectedModel(type)
    analyticsAPI.evaluation(type)
      .then(res => setEvalData(res.data))
      .catch(() => setEvalData(null))
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
  }

  const models = modelsData || {}

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Analytics</h2>

      {/* Model selector */}
      <div className="flex gap-2 mb-6">
        {Object.keys(models).map(key => (
          <button
            key={key}
            onClick={() => loadEvaluation(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedModel === key ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {(models[key] as Record<string, unknown>).name as string}
          </button>
        ))}
      </div>

      {/* Model overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {Object.entries(models).map(([key, val]) => {
          const m = val as Record<string, unknown>
          const metrics = m.current_metrics as Record<string, number> | null
          return (
            <div key={key} className="bg-white rounded-xl shadow-sm border p-4">
              <h4 className="font-semibold text-slate-900">{m.name as string}</h4>
              <p className="text-xs text-slate-500 mt-1">{m.description as string}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-blue-600">{metrics?.accuracy ? `${(metrics.accuracy * 100).toFixed(1)}%` : '-'}</p>
                  <p className="text-xs text-slate-500">Accuracy</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-600">{metrics?.f1_score ? `${(metrics.f1_score * 100).toFixed(1)}%` : '-'}</p>
                  <p className="text-xs text-slate-500">F1 Score</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-amber-600">{metrics?.roc_auc ? `${(metrics.roc_auc * 100).toFixed(1)}%` : '-'}</p>
                  <p className="text-xs text-slate-500">AUC</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">Version: {m.current_version as string || 'N/A'}</p>
            </div>
          )
        })}
      </div>

      {/* Evaluation plots */}
      {evalData && (
        <div className="space-y-6">
          {/* Classification Report */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Classification Report</h3>
            <div className="overflow-x-auto">
              <table className="text-sm w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Class</th>
                    <th className="text-left py-2 px-3">Precision</th>
                    <th className="text-left py-2 px-3">Recall</th>
                    <th className="text-left py-2 px-3">F1-Score</th>
                    <th className="text-left py-2 px-3">Support</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(evalData.classification_report as Record<string, unknown>)
                    .filter(([key]) => !['accuracy', 'macro avg', 'weighted avg'].includes(key))
                    .map(([key, val]) => {
                      const v = val as Record<string, number>
                      return (
                        <tr key={key} className="border-b border-slate-100">
                          <td className="py-2 px-3 capitalize">Class {key}</td>
                          <td className="py-2 px-3">{v.precision?.toFixed(4)}</td>
                          <td className="py-2 px-3">{v.recall?.toFixed(4)}</td>
                          <td className="py-2 px-3">{v['f1-score']?.toFixed(4)}</td>
                          <td className="py-2 px-3">{v.support}</td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Plots */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Confusion Matrix */}
            {evalData.plots && (evalData.plots as Record<string, string>).confusion_matrix && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Confusion Matrix</h3>
                <img src={`data:image/png;base64,${(evalData.plots as Record<string, string>).confusion_matrix}`} alt="Confusion Matrix" className="w-full" />
              </div>
            )}

            {/* ROC Curve */}
            {evalData.plots && (evalData.plots as Record<string, string>).roc_curve && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">ROC Curve</h3>
                <img src={`data:image/png;base64,${(evalData.plots as Record<string, string>).roc_curve}`} alt="ROC Curve" className="w-full" />
              </div>
            )}

            {/* Precision-Recall */}
            {evalData.plots && (evalData.plots as Record<string, string>).precision_recall && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Precision-Recall Curve</h3>
                <img src={`data:image/png;base64,${(evalData.plots as Record<string, string>).precision_recall}`} alt="PR Curve" className="w-full" />
              </div>
            )}

            {/* Feature Importance */}
            {evalData.plots && (evalData.plots as Record<string, string>).feature_importance && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Feature Importance</h3>
                <img src={`data:image/png;base64,${(evalData.plots as Record<string, string>).feature_importance}`} alt="Feature Importance" className="w-full" />
              </div>
            )}
          </div>

          {/* Fairness Metrics */}
          {evalData.fairness_metrics && Object.keys(evalData.fairness_metrics as object).length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Fairness Metrics</h3>
              <pre className="text-sm bg-slate-50 p-4 rounded-lg overflow-x-auto">
                {JSON.stringify(evalData.fairness_metrics, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {!evalData && (
        <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500 text-sm">
          Select a model above to view detailed evaluation metrics and plots.
        </div>
      )}
    </div>
  )
}
