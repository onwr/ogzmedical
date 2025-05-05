import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';

const Applications = () => {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const q = query(collection(db, 'applications'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const apps = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setApplications(apps);
      } catch (error) {
        console.error('Error fetching applications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplications();
  }, []);

  const handleGeneratePDF = async (application) => {
    try {
      const doc = new jsPDF();
      
      // Başlık
      doc.setFontSize(16);
      doc.text('TIBBİ TAHLİLLER İSTEM FORMU', 105, 20, { align: 'center' });
      
      // Hasta Bilgileri
      doc.setFontSize(12);
      doc.text('Hasta Bilgileri:', 20, 40);
      doc.setFontSize(10);
      doc.text(`Ad Soyad: ${application.patientInfo.name}`, 20, 50);
      doc.text(`T.C. Kimlik No: ${application.patientInfo.tcNo}`, 20, 60);
      doc.text(`Doğum Tarihi: ${application.patientInfo.birthDate}`, 20, 70);
      doc.text(`Cinsiyet: ${application.patientInfo.gender}`, 20, 80);
      
      // Testler
      doc.setFontSize(12);
      doc.text('Seçilen Testler:', 20, 100);
      doc.setFontSize(10);
      
      let yPosition = 110;
      application.selectedTests.forEach((test, index) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(`${index + 1}. ${test.name} - ${test.price} TL`, 20, yPosition);
        yPosition += 10;
      });
      
      // Toplam Fiyat
      doc.setFontSize(12);
      doc.text(`Toplam Tutar: ${application.totalPrice} TL`, 20, yPosition + 10);
      
      // Bayi Bilgisi
      doc.text(`Bayi: ${application.dealerName}`, 20, yPosition + 20);
      
      // Tarih
      const date = new Date(application.createdAt.toDate()).toLocaleDateString('tr-TR');
      doc.text(`Oluşturma Tarihi: ${date}`, 20, yPosition + 30);
      
      // PDF'i indir
      doc.save(`tahlil-formu-${application.id}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('PDF oluşturulurken bir hata oluştu');
    }
  };

  const handleEdit = (applicationId) => {
    navigate(`/form/${applicationId}`);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Başvuru Listesi</h1>
        </div>

        {/* Applications Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hasta Bilgisi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Testler
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fiyat
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bayi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {applications.map((app) => (
                <tr key={app.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{app.patientInfo.name}</div>
                    <div className="text-sm text-gray-500">{app.patientInfo.phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {app.selectedTests.map(test => test.name).join(', ')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{app.totalPrice} TL</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{app.dealerName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleGeneratePDF(app)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      PDF
                    </button>
                    <button
                      onClick={() => handleEdit(app.id)}
                      className="text-green-600 hover:text-green-900"
                    >
                      Form
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Applications; 