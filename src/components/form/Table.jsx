import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  getDoc,
  doc,
  updateDoc,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import Header from '@components/Header';

const COOKIE_KEY = 'selectedTests';

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

const setCookie = (name, value, days = 30) => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
};

const Table = ({ application, dealerName, showPrices }) => {
  const { dealerName: urlDealerName } = useParams();
  const navigate = useNavigate();
  const [testGroups, setTestGroups] = useState([]);
  const [packages, setPackages] = useState([]);
  const [selectedTests, setSelectedTests] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dealer, setDealer] = useState(null);
  const [doctorNotes, setDoctorNotes] = useState(application?.doctorNotes || '');
  const [patientInfo, setPatientInfo] = useState({
    name: '',
    birthDate: '',
    requestDate: '',
    tcNo: '',
    gender: '',
    phone: '',
    email: '',
  });
  const [dealerPrices, setDealerPrices] = useState({});
  const [totalPrice, setTotalPrice] = useState(0);
  const [selectedPackages, setSelectedPackages] = useState([]);

  useEffect(() => {
    if (application) {
      setPatientInfo(application.patientInfo);
      // Seçili testleri ayarla
      const newSelectedTests = {};
      testGroups.forEach((group, groupIndex) => {
        group.tests.forEach((test, testIndex) => {
          if (application.selectedTests.some((selectedTest) => selectedTest.testId === test.id)) {
            newSelectedTests[`${groupIndex}-${testIndex}`] = true;
          }
        });
      });
      setSelectedTests(newSelectedTests);
    }
  }, [application, testGroups]);

  useEffect(() => {
    if (urlDealerName) {
      fetchDealer();
    }
    fetchTestGroups();
    fetchPackages();
  }, [urlDealerName]);

  useEffect(() => {
    if (dealer?.id) {
      fetchDealerPrices();
    }
  }, [dealer?.id]);

  const fetchDealer = async () => {
    try {
      const dealersQuery = query(collection(db, 'dealers'), where('isActive', '==', true));
      const dealersSnapshot = await getDocs(dealersQuery);

      // Bayi adını küçük harfe çevir
      const searchName = urlDealerName.toLowerCase();

      // Tüm aktif bayileri filtrele
      const foundDealer = dealersSnapshot.docs.find((doc) => {
        const dealerData = doc.data();
        return dealerData.name.toLowerCase() === searchName;
      });

      if (foundDealer) {
        setDealer({
          id: foundDealer.id,
          ...foundDealer.data(),
        });
      } else {
        console.error('Dealer not found');
        alert('Bayi bilgisi bulunamadı');
      }
    } catch (error) {
      console.error('Error fetching dealer:', error);
      alert('Bayi bilgisi alınırken bir hata oluştu');
    }
  };

  const fetchTestGroups = async () => {
    try {
      const q = query(collection(db, 'testGroups'), orderBy('order'));
      const querySnapshot = await getDocs(q);
      const groups = [];

      for (const groupDoc of querySnapshot.docs) {
        const testsQuery = query(collection(db, 'tests'), where('groupId', '==', groupDoc.id));
        const testsSnapshot = await getDocs(testsQuery);
        let tests = testsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Eğer testlerin order değeri yoksa, otomatik olarak ekle
        const needsOrderUpdate = tests.some((test) => test.order === undefined);
        if (needsOrderUpdate) {
          const batch = writeBatch(db);
          tests = tests.map((test, index) => {
            const testRef = doc(db, 'tests', test.id);
            batch.update(testRef, { order: index });
            return { ...test, order: index };
          });
          await batch.commit();
        }

        // Order'a göre sırala
        tests.sort((a, b) => (a.order || 0) - (b.order || 0));

        groups.push({
          id: groupDoc.id,
          title: groupDoc.data().title,
          tests,
        });
      }

      setTestGroups(groups);
    } catch (error) {
      console.error('Error fetching test groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPackages = async () => {
    try {
      const packagesQuery = query(collection(db, 'packages'), orderBy('order'));
      const packagesSnapshot = await getDocs(packagesQuery);
      const packagesList = packagesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        order: doc.data().order ?? Number.MAX_SAFE_INTEGER, // Order değeri olmayanları en sona koy
      }));

      // Order değerine göre sırala
      const sortedPackages = packagesList.sort((a, b) => a.order - b.order);
      setPackages(sortedPackages);
    } catch (error) {
      console.error('Error fetching packages:', error);
    }
  };

  const fetchDealerPrices = async () => {
    try {
      const dealerPricesQuery = query(
        collection(db, 'dealerPrices'),
        where('dealerId', '==', dealer.id)
      );
      const dealerPricesSnapshot = await getDocs(dealerPricesQuery);

      const prices = {};
      dealerPricesSnapshot.forEach((doc) => {
        const data = doc.data();
        prices[data.testId] = data.price;
      });

      setDealerPrices(prices);
    } catch (error) {
      console.error('Error fetching dealer prices:', error);
    }
  };

  const handleCheckboxChange = (groupIndex, testIndex) => {
    const key = `${groupIndex}-${testIndex}`;
    setSelectedTests((prev) => {
      const newState = { ...prev };
      if (newState[key]) {
        delete newState[key];
      } else {
        newState[key] = true;
      }
      return newState;
    });
  };

  const handleSelectPackage = (packageTests, packagePrice) => {
    console.log('Package Price:', packagePrice);
    console.log('Package Tests:', packageTests);

    const newSelectedTests = { ...selectedTests };
    let totalPrice = 0;

    // Add all tests from the package to selectedTests
    packageTests.forEach((test) => {
      // Find the group and test index for this test
      testGroups.forEach((group, groupIndex) => {
        const testIndex = group.tests.findIndex((t) => t.id === test.id);
        if (testIndex !== -1) {
          const key = `${groupIndex}-${testIndex}`;
          newSelectedTests[key] = true;
        }
      });
    });

    // Use package price if available, otherwise calculate from individual tests
    if (packagePrice) {
      totalPrice = Number(packagePrice);
      console.log('Using package price:', totalPrice);
      // Add package to selectedPackages
      setSelectedPackages((prev) => [...prev, { tests: packageTests, price: packagePrice }]);
    } else {
      totalPrice = packageTests.reduce((sum, test) => sum + (test.basePrice || 0), 0);
      console.log('Using calculated price:', totalPrice);
    }

    setSelectedTests(newSelectedTests);
    setTotalPrice((prev) => {
      const newTotal = prev + totalPrice;
      console.log('New total price:', newTotal);
      return newTotal;
    });
    setIsModalOpen(false);
  };

  const calculateTotalPrice = () => {
    let total = 0;

    // First add up package prices
    total += selectedPackages.reduce((sum, pkg) => sum + Number(pkg.price), 0);

    // Then add up individual test prices that aren't part of any package
    Object.keys(selectedTests).forEach((key) => {
      const [groupIndex, testIndex] = key.split('-').map(Number);
      const test = testGroups[groupIndex].tests[testIndex];

      // Check if this test is part of any selected package
      const isInPackage = selectedPackages.some((pkg) => pkg.tests.some((t) => t.id === test.id));

      if (!isInPackage) {
        const price = dealerPrices[test.id] || test.basePrice;
        total += price;
      }
    });

    return total;
  };

  const handleCreateApplication = async () => {
    if (!patientInfo.name) {
      alert('Lütfen hasta bilgilerini eksiksiz doldurun');
      return;
    }

    if (Object.keys(selectedTests).length === 0) {
      alert('Lütfen en az bir test seçin');
      return;
    }

    if (!dealer && !application) {
      alert('Bayi bilgisi bulunamadı. Lütfen sayfayı yenileyip tekrar deneyin.');
      return;
    }

    try {
      const selectedTestsList = Object.keys(selectedTests).map((key) => {
        const [groupIndex, testIndex] = key.split('-').map(Number);
        const test = testGroups[groupIndex].tests[testIndex];
        return {
          testId: test.id,
          name: test.name,
          price: test.basePrice,
          costPrice: test.costPrice || 0,
        };
      });

      const totalCost = selectedTestsList.reduce((sum, test) => sum + (test.costPrice || 0), 0);
      const totalPrice = calculateTotalPrice();

      const applicationData = {
        patientInfo,
        selectedTests: selectedTestsList,
        totalPrice,
        totalCost,
        profit: totalPrice - totalCost,
        status: 'pending',
        updatedAt: new Date(),
        doctorNotes,
        read: false,
      };

      if (application) {
        // Düzenleme modu
        applicationData.dealerId = application.dealerId;
        applicationData.dealerName = application.dealerName;
        await updateDoc(doc(db, 'applications', application.id), applicationData);
        alert('Başvuru başarıyla güncellendi');
        navigate('/admin/applications');
      } else {
        // Yeni başvuru
        applicationData.dealerId = dealer.id;
        applicationData.dealerName = dealer.name || 'Bilinmeyen Bayi';
        applicationData.createdAt = new Date();
        await addDoc(collection(db, 'applications'), applicationData);
        alert('Başvuru başarıyla oluşturuldu');
      }

      // Reset form
      setSelectedTests({});
      setPatientInfo({
        name: '',
        birthDate: '',
        requestDate: '',
        tcNo: '',
        gender: '',
        phone: '',
        email: '',
      });
      setDoctorNotes('');
    } catch (error) {
      console.error('Error creating/updating application:', error);
      alert('Başvuru oluşturulurken bir hata oluştu');
    }
  };

  const handlePatientInfoChange = (newPatientInfo) => {
    setPatientInfo((prev) => ({ ...prev, ...newPatientInfo }));
  };

  if (isLoading) {
    return (
      <div className='flex h-64 items-center justify-center'>
        <div className='h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600'></div>
      </div>
    );
  }

  return (
    <>
      <Header
        onPatientInfoChange={handlePatientInfoChange}
        initialValues={patientInfo}
        setIsModalOpen={setIsModalOpen}
      />

      <div className='relative'>
        <div className='rounded-lg bg-white px-2 py-0 shadow'>
          {isModalOpen && (
            <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm'>
              <div className='w-full max-w-2xl rounded-lg bg-white p-4 shadow-lg'>
                <div className='mb-4 flex items-center justify-between'>
                  <h3 className='text-lg font-medium text-gray-900'>Paketler</h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className='text-gray-400 hover:text-gray-500'
                  >
                    <svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M6 18L18 6M6 6l12 12'
                      />
                    </svg>
                  </button>
                </div>
                <div className='grid grid-cols-2 gap-4 md:grid-cols-3'>
                  {packages.map((pkg) => {
                    console.log('Rendering package:', pkg);
                    return (
                      <div
                        key={pkg.id}
                        className='group relative cursor-pointer rounded-lg border border-gray-200 p-3 hover:border-blue-500'
                        onClick={() => handleSelectPackage(pkg.tests, pkg.price)}
                      >
                        <div className='aspect-w-16 aspect-h-9 mb-2 overflow-hidden rounded-lg bg-gray-100'>
                          {pkg.image ? (
                            <img
                              src={pkg.image}
                              alt={pkg.name}
                              className='h-full w-full object-cover'
                            />
                          ) : (
                            <div className='flex h-full items-center justify-center bg-gray-100'>
                              <span className='text-sm text-gray-400'>Görsel Yok</span>
                            </div>
                          )}
                        </div>
                        <h4 className='text-sm font-medium text-gray-900'>{pkg.name}</h4>
                        <p className='mt-1 text-xs text-gray-500'>{pkg.tests.length} test</p>
                        {pkg.price ? (
                          <p className='mt-1 text-sm font-medium text-blue-600'>{pkg.price} TL</p>
                        ) : (
                          <p className='mt-1 text-sm font-medium text-gray-500'>
                            {pkg.tests.reduce((sum, test) => sum + (test.basePrice || 0), 0)} TL
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className='w-full columns-4 gap-1'>
            {testGroups.map((group, groupIndex) => (
              <div
                key={group.id}
                className='min-w-0 break-inside-avoid rounded border border-gray-300 p-1'
              >
                <div className='mb-1 truncate text-[7px] font-bold text-gray-800 md:text-base'>
                  {group.title}
                </div>
                <div className='flex flex-col gap-[1px]'>
                  {group.tests.map((test, testIndex) => {
                    const checked = !!selectedTests[`${groupIndex}-${testIndex}`];
                    return (
                      <label
                        key={test.id}
                        className='flex cursor-pointer items-center gap-[2px] text-[7px] font-medium text-gray-700 select-none md:text-xs'
                      >
                        <span className='relative flex items-center justify-center'>
                          <input
                            type='checkbox'
                            checked={checked}
                            onChange={() => handleCheckboxChange(groupIndex, testIndex)}
                            className='peer h-3 w-3 appearance-none rounded-[4px] border border-gray-400 bg-white transition-all duration-150 outline-none checked:border-blue-600 checked:bg-blue-600 md:h-4 md:w-4'
                            style={{ minWidth: '12px', minHeight: '12px' }}
                          />
                          <span className='pointer-events-none absolute top-0 left-0 flex h-3 w-3 items-center justify-center md:h-4 md:w-4'>
                            {checked && (
                              <svg
                                width='10'
                                height='10'
                                viewBox='0 0 10 10'
                                className='text-white md:text-white'
                                fill='none'
                                xmlns='http://www.w3.org/2000/svg'
                              >
                                <path
                                  d='M2 5.5L4.2 7.5L8 3.5'
                                  stroke='currentColor'
                                  strokeWidth='1.2'
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                                />
                              </svg>
                            )}
                          </span>
                        </span>
                        <span className='truncate'>
                          {test.name}
                          {showPrices && (
                            <span className='text-xs text-gray-500'>
                              -{' '}
                              {dealerPrices[test.id]
                                ? `${dealerPrices[test.id]} TL`
                                : test.basePrice}
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Total, Notes and Submit */}
        <div className='mt-2 rounded-lg bg-white p-1'>
          <div className='mb-2 flex items-center justify-between'>
            <div className='text-xs font-medium'>
              Toplam Tutar: <span className='text-blue-600'>{calculateTotalPrice()} TL</span>
            </div>
            <div className='mx-4 flex-1'>
              <textarea
                className='w-full resize-none rounded border border-gray-300 px-2 py-1 text-[8px] md:text-xs'
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                placeholder='Notlar ve Açıklamalar...'
                rows={1}
              />
            </div>
          </div>
          <div className='flex justify-end'>
            <button
              onClick={handleCreateApplication}
              className='rounded-sm bg-blue-600 px-6 py-1 text-xs font-medium text-white hover:bg-blue-700 md:rounded-lg md:py-2 md:text-sm'
            >
              {application ? 'Başvuruyu Güncelle' : 'Laboratuvara Gönder'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
export default Table;
