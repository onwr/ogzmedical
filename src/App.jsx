import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { auth } from './config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import AdminLayout from './components/admin/AdminLayout';
import Applications from './pages/admin/Applications';
import Dealers from './pages/admin/Dealers';
import Tests from './pages/admin/Tests';
import Finance from './pages/admin/Finance';
import PDFs from './pages/admin/PDFs';
import Login from './pages/admin/Login';
import Home from './pages/Form';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route
          path='/admin'
          element={
            isAuthenticated ? (
              <AdminLayout>
                <Navigate to='/admin/applications' replace />
              </AdminLayout>
            ) : (
              <Navigate to='/admin/login' replace />
            )
          }
        />
        <Route
          path='/admin/login'
          element={isAuthenticated ? <Navigate to='/admin' replace /> : <Login />}
        />
        <Route
          path='/admin/applications'
          element={isAuthenticated ? <Applications /> : <Navigate to='/admin/login' replace />}
        />
        <Route
          path='/admin/dealers'
          element={isAuthenticated ? <Dealers /> : <Navigate to='/admin/login' replace />}
        />
        <Route
          path='/admin/tests'
          element={isAuthenticated ? <Tests /> : <Navigate to='/admin/login' replace />}
        />
        <Route
          path='/admin/finance'
          element={isAuthenticated ? <Finance /> : <Navigate to='/admin/login' replace />}
        />
        <Route
          path='/admin/pdfs'
          element={isAuthenticated ? <PDFs /> : <Navigate to='/admin/login' replace />}
        />

        {/* Public Routes */}
        <Route path='/' element={<Navigate to='/admin' replace />} />

        <Route path='/:dealerId' element={<Home />} />

        <Route path='/form/:applicationId' element={<Home />} />
      </Routes>
    </Router>
  );
};

export default App;
