import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Patients from './pages/Patients'
import NewDiagnosis from './pages/NewDiagnosis'
import DiagnosisHistory from './pages/DiagnosisHistory'
import Analytics from './pages/Analytics'
import MLOpsMonitor from './pages/MLOpsMonitor'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token')
  return token ? <>{children}</> : <Navigate to="/login" />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="patients" element={<Patients />} />
        <Route path="diagnosis/new" element={<NewDiagnosis />} />
        <Route path="diagnosis/history/:patientId?" element={<DiagnosisHistory />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="mlops" element={<MLOpsMonitor />} />
      </Route>
    </Routes>
  )
}
