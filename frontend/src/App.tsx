import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import AdminLogin from './pages/AdminLogin'
import Dashboard from './pages/Dashboard'
import Patients from './pages/Patients'
import NewDiagnosis from './pages/NewDiagnosis'
import DiagnosisHistory from './pages/DiagnosisHistory'
import Analytics from './pages/Analytics'
import MLOpsMonitor from './pages/MLOpsMonitor'
import AdminUsers from './pages/AdminUsers'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token')
  return token ? <>{children}</> : <Navigate to="/login" />
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/admin/login" />
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  return user.role === 'admin' ? <>{children}</> : <Navigate to="/admin/login" />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="patients" element={<Patients />} />
        <Route path="diagnosis/new" element={<NewDiagnosis />} />
        <Route path="diagnosis/history/:patientId?" element={<DiagnosisHistory />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="mlops" element={<MLOpsMonitor />} />
        <Route path="admin" element={<AdminRoute><AdminUsers /></AdminRoute>} />
      </Route>
    </Routes>
  )
}