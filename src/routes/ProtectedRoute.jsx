import { Navigate, useLocation } from 'react-router-dom';
import { getToken } from '../utils/authStorage.js';

const ProtectedRoute = ({ children }) => {
  const token = getToken();
  const location = useLocation();

  if (!token) {
    const redirectTo = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirectTo)}`} replace />;
  }

  return children;
};

export default ProtectedRoute;
