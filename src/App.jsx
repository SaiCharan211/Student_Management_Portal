import { Routes, Route, Navigate } from 'react-router-dom';
import { isConfigured } from './supabaseClient.js';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import RoleRoute from './components/RoleRoute.jsx';
import Login from './pages/Login.jsx';
import StudentSignup from './pages/StudentSignup.jsx';
import RegisterStudent from './pages/RegisterStudent.jsx';
import StudentList from './pages/StudentList.jsx';
import Attendance from './pages/Attendance.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import ManageStaff from './pages/ManageStaff.jsx';
import Account from './pages/Account.jsx';

export default function App() {
  if (!isConfigured) {
    return (
      <div className="center-screen">
        <div className="card narrow">
          <h1>Setup needed</h1>
          <p>
            Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to a{' '}
            <code>.env</code> file, then restart <code>npm run dev</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/admin-login" element={<Login adminOnly />} />
      <Route path="/activate" element={<StudentSignup />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/account" element={<Account />} />
        <Route element={<RoleRoute allow={['student']} />}>
          <Route path="/me" element={<StudentDashboard />} />
        </Route>
        <Route element={<RoleRoute allow={['admin', 'staff']} />}>
          <Route path="/students" element={<StudentList />} />
          <Route path="/students/:id/edit" element={<RegisterStudent />} />
          <Route path="/register" element={<RegisterStudent />} />
          <Route path="/attendance" element={<Attendance />} />
        </Route>
        <Route element={<RoleRoute allow={['admin']} />}>
          <Route path="/staff" element={<ManageStaff />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
