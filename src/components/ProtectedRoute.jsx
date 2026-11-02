import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Layout from './Layout.jsx';
import Spinner from './Spinner.jsx';

export default function ProtectedRoute() {
  const { session, profile, loading, signOut } = useAuth();

  if (loading) return <Spinner />;
  if (!session) return <Navigate to="/login" replace />;

  if (!profile) {
    return (
      <div className="center-screen">
        <div className="card narrow">
          <h1>Access not available</h1>
          <p>Your account has no staff profile. Please contact an administrator.</p>
          <button className="btn" onClick={signOut}>Log out</button>
        </div>
      </div>
    );
  }

  return <Layout />;
}
