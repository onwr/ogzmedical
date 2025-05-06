import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Table from '@components/form/Table';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

const Form = () => {
  const { applicationId, dealerName } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [application, setApplication] = useState(null);
  const [dealer, setDealer] = useState(null);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (dealerName) {
          const dealersQuery = query(
            collection(db, 'dealers'),
            where('isActive', '==', true)
          );
          const dealersSnapshot = await getDocs(dealersQuery);
          
          const searchName = dealerName.toLowerCase();
          
          const foundDealer = dealersSnapshot.docs.find(doc => {
            const dealerData = doc.data();
            return dealerData.name.toLowerCase() === searchName;
          });
          
          if (foundDealer) {
            setDealer({
              id: foundDealer.id,
              ...foundDealer.data()
            });
          } else {
            setShowError(true);
          }
        }

        // Başvuru bilgilerini çek
        if (applicationId) {
          const docRef = doc(db, 'applications', applicationId);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setApplication({
              id: docSnap.id,
              ...docSnap.data()
            });
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setShowError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [applicationId, dealerName]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (showError) {
    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-xl">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Bayi Bulunamadı</h3>
            <p className="text-sm text-gray-500 mb-6">
              {dealerName} isimli bayi aktif değil veya sistemde kayıtlı değil.
            </p>
            <button
              onClick={() => navigate('/')}
              className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Ana Sayfaya Dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Table application={application} dealerName={dealer?.name} />
    </div>
  );
};

export default Form;