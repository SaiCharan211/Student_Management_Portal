import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { homePath } from '../utils.js';

// Only lets the listed roles through; everyone else goes to their own home page.
export default function RoleRoute({ allow }) {
  const { role } = useAuth();
  return allow.includes(role) ? <Outlet /> : <Navigate to={homePath(role)} replace />;
}
