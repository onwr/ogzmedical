import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Table from '@components/form/Table';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const Form = () => {
  const { applicationId } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [application, setApplication] = useState(null);

  useEffect(() => {
    const fetchApplication = async () => {
      if (applicationId) {
        try {
          const docRef = doc(db, 'applications', applicationId);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setApplication({
              id: docSnap.id,
              ...docSnap.data()
            });
          }
        } catch (error) {
          console.error('Error fetching application:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    fetchApplication();
  }, [applicationId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <Table application={application} />
    </div>
  );
};

export default Form;