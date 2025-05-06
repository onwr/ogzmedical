import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, getDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Applications = () => {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showNewApplicationAlert, setShowNewApplicationAlert] = useState(false);
  const [newApplication, setNewApplication] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchApplications();

    // Yeni başvuruları dinle
    const q = query(collection(db, 'applications'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const newApp = { id: change.doc.id, ...change.doc.data() };
          setApplications(prev => [newApp, ...prev]);
          
          // Yeni başvuru bildirimi göster
          setNewApplication(newApp);
          setShowNewApplicationAlert(true);
          
          // 5 saniye sonra bildirimi kapat
          setTimeout(() => {
            setShowNewApplicationAlert(false);
          }, 5000);
        }
      });
    });

    return () => unsubscribe();
  }, []);

  const fetchApplications = async () => {
    try {
      setIsLoading(true);
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

  const handleDelete = async (applicationId) => {
    if (!window.confirm('Bu başvuruyu silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteDoc(doc(db, 'applications', applicationId));
      setApplications(prev => prev.filter(app => app.id !== applicationId));
    } catch (error) {
      console.error('Error deleting application:', error);
      alert('Başvuru silinirken bir hata oluştu');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredApplications = applications.filter(app => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const searchFields = [
      app.patientInfo.name,
      app.patientInfo.tcNo,
      app.patientInfo.birthDate,
      app.patientInfo.gender,
      app.dealerName,
      app.doctorNotes,
      app.totalPrice?.toString(),
      new Date(app.createdAt?.toDate()).toLocaleDateString('tr-TR'),
      ...app.selectedTests.map(test => test.name)
    ];

    return searchFields.some(field => 
      field && field.toString().toLowerCase().includes(searchLower)
    );
  });

  const handleGeneratePDF = async (application) => {
    try {
      const doc = new jsPDF();
      
      // Set document properties
      doc.setProperties({
        title: 'Tıbbi Tahliller İstem Formu',
        subject: 'Hasta Tahlil Formu',
        author: 'Laboratuvar Sistemi',
        creator: 'Laboratuvar Sistemi'
      });

      // Add watermark
      doc.setTextColor(240, 240, 240);
      doc.setFontSize(60);
      doc.setFont('helvetica', 'bold');
      doc.text('ORIGINAL', 105, 140, { align: 'center', angle: 45 });
      doc.setTextColor(0, 0, 0);

      // Header with gradient effect
      doc.setFillColor(45, 55, 72);
      doc.rect(0, 0, 210, 50, 'F');
      
      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('TIBBI TAHLILLER', 105, 25, { align: 'center' });
      doc.setFontSize(16);
      doc.text('ISTEM FORMU', 105, 35, { align: 'center' });

      // Form Number and Date
      doc.setFontSize(10);
      doc.text(`Form No: ${application.id.slice(0, 8)}`, 20, 60);
      const date = new Date(application.createdAt.toDate()).toLocaleDateString('tr-TR');
      doc.text(`Tarih: ${date}`, 170, 60, { align: 'right' });

      // Patient Information Card
      doc.setFillColor(247, 250, 252);
      doc.roundedRect(10, 70, 190, 80, 3, 3, 'F');
      
      // Add patient photos if exist
      if (application.patientInfo.photo || application.patientInfo.extraPhoto) {
        try {
          const addImageToPDF = async (imageUrl, x, y) => {
            const img = new Image();
            img.src = imageUrl;
            await new Promise((resolve) => {
              img.onload = () => {
                const imgWidth = 30;
                const imgHeight = 40;
                doc.addImage(img, 'JPEG', x, y, imgWidth, imgHeight);
                resolve();
              };
              img.onerror = resolve;
            });
          };

          if (application.patientInfo.photo) {
            await addImageToPDF(application.patientInfo.photo, 150, 75);
          }
          if (application.patientInfo.extraPhoto) {
            await addImageToPDF(application.patientInfo.extraPhoto, 150, 120);
          }
        } catch (error) {
          console.error('Error adding photos to PDF:', error);
        }
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(45, 55, 72);
      doc.text('HASTA BILGILERI', 20, 85);

      // Patient Details
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const patientInfo = [
        ['Ad Soyad:', application.patientInfo.name],
        ['T.C. Kimlik No:', application.patientInfo.tcNo],
        ['Dogum Tarihi:', application.patientInfo.birthDate],
        ['Cinsiyet:', application.patientInfo.gender],
        ['Istem Tarihi:', date]
      ];

      let yPos = 95;
      patientInfo.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, 20, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(value, 70, yPos);
        yPos += 10;
      });

      // Doctor Notes Section
      if (application.doctorNotes) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(45, 55, 72);
        doc.text('Doktor Notu:', 20, yPos + 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(60, 60, 60);
        doc.text(doc.splitTextToSize(application.doctorNotes, 170), 20, yPos + 15);
        yPos += 25;
      }

      // Tests Section
      doc.setFillColor(247, 250, 252);
      doc.roundedRect(10, yPos + 10, 190, 30, 3, 3, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('SECILEN TESTLER', 20, yPos + 30);

      // Create table for tests with modern styling
      autoTable(doc, {
        startY: yPos + 40,
        head: [['No', 'Test Adi', 'Fiyat']],
        body: application.selectedTests.map((test, index) => [
          index + 1,
          test.name,
          `${test.price} TL`
        ]),
        theme: 'grid',
        headStyles: {
          fillColor: [45, 55, 72],
          textColor: 255,
          fontSize: 11,
          fontStyle: 'bold',
          halign: 'center'
        },
        styles: {
          fontSize: 10,
          cellPadding: 5,
          halign: 'left'
        },
        columnStyles: {
          0: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 40, halign: 'right' }
        },
        alternateRowStyles: {
          fillColor: [247, 250, 252]
        }
      });

      // Total Price Section
      const finalY = doc.lastAutoTable.finalY + 20;
      doc.setFillColor(45, 55, 72);
      doc.roundedRect(10, finalY, 190, 40, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`TOPLAM TUTAR: ${application.totalPrice} TL`, 105, finalY + 25, { align: 'center' });

      // Footer Information
      const footerY = finalY + 50;
      doc.setTextColor(45, 55, 72);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      // Dealer Info
      doc.setFillColor(247, 250, 252);
      doc.roundedRect(10, footerY, 190, 30, 3, 3, 'F');
      doc.text(`Bayi: ${application.dealerName}`, 20, footerY + 15);
      doc.text(`Islem Tarihi: ${date}`, 170, footerY + 15, { align: 'right' });

      // Add page numbers
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(128, 128, 128);
        doc.text(`Sayfa ${i} / ${pageCount}`, 105, 287, { align: 'center' });
      }

      // Save PDF
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
        {/* New Application Alert */}
        {showNewApplicationAlert && newApplication && (
          <div className="fixed top-20 right-4 z-50 animate-fade-in-down">
            <div className="bg-white rounded-lg shadow-lg p-4 border-l-4 border-green-500">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-gray-900">Yeni Başvuru</h3>
                  <div className="mt-1 text-sm text-gray-500">
                    <p>{newApplication.patientInfo.name}</p>
                    <p className="text-xs">{new Date(newApplication.createdAt.toDate()).toLocaleString('tr-TR')}</p>
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                  <button
                    className="inline-flex text-gray-400 hover:text-gray-500"
                    onClick={() => setShowNewApplicationAlert(false)}
                  >
                    <span className="sr-only">Kapat</span>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Başvuru Listesi</h1>
        </div>

        {/* Search Box */}
        <div className="max-w-md">
          <div className="relative">
            <input
              type="text"
              className="w-full px-4 py-2 border outline-none border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ara... (Ad, TCKN, Test, Tarih, Bayi vs.)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Applications Table */}
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <div className="min-w-full inline-block align-middle">
            <div className="overflow-hidden">
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
                      Doktor Notu
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredApplications.map((app) => (
                    <tr key={app.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-4">
                          <div className="flex gap-2">
                            {app.patientInfo.photo && (
                              <div className="w-12 h-12 rounded-lg overflow-hidden">
                                <img
                                  src={app.patientInfo.photo}
                                  alt="Kimlik fotoğrafı"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            {app.patientInfo.extraPhoto && (
                              <div className="w-12 h-12 rounded-lg overflow-hidden">
                                <img
                                  src={app.patientInfo.extraPhoto}
                                  alt="Ek fotoğraf"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{app.patientInfo.name}</div>
                            <div className="text-sm text-gray-500">{app.patientInfo.tcNo}</div>
                            <div className="text-sm text-gray-500">{app.patientInfo.birthDate}</div>
                          </div>
                        </div>
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
                      <td className="px-6 py-4 whitespace-nowrap max-w-xs truncate">
                        <div className="text-xs text-gray-700">
                          {app.doctorNotes ? app.doctorNotes.slice(0, 80) : <span className="text-gray-300">-</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleGeneratePDF(app)}
                            className="text-blue-600 hover:text-blue-900"
                            title="PDF İndir"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleEdit(app.id)}
                            className="text-green-600 hover:text-green-900"
                            title="Düzenle"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(app.id)}
                            className="text-red-600 hover:text-red-900"
                            disabled={isDeleting}
                            title="Sil"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Applications; 