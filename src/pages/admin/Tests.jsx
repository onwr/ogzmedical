import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, where, getDoc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';

const Tests = () => {
  const [tests, setTests] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [testGroups, setTestGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [newGroupTitle, setNewGroupTitle] = useState('');
  const [selectedDealer, setSelectedDealer] = useState(null);
  const [priceUpdates, setPriceUpdates] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    groupId: '',
    basePrice: '',
    costPrice: ''
  });
  const [packages, setPackages] = useState([]);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [newPackageName, setNewPackageName] = useState('');
  const [newPackageTests, setNewPackageTests] = useState([]);
  const [isUploadingPackage, setIsUploadingPackage] = useState(false);
  const [uploadingPackageId, setUploadingPackageId] = useState(null);

  useEffect(() => {
    fetchTests();
    fetchDealers();
    fetchTestGroups();
    fetchPackages();
  }, []);

  const fetchTests = async () => {
    try {
      const q = query(collection(db, 'tests'), orderBy('name'));
      const querySnapshot = await getDocs(q);
      const testsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Her test için bayi fiyatlarını çek
      const testsWithPrices = await Promise.all(testsList.map(async (test) => {
        const dealerPricesQuery = query(
          collection(db, 'dealerPrices'),
          where('testId', '==', test.id)
        );
        const dealerPricesSnapshot = await getDocs(dealerPricesQuery);
        
        const dealerPrices = {};
        dealerPricesSnapshot.forEach(doc => {
          const data = doc.data();
          dealerPrices[data.dealerId] = data.price;
        });

        return {
          ...test,
          dealerPrices
        };
      }));

      setTests(testsWithPrices);
    } catch (error) {
      console.error('Error fetching tests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTestGroups = async () => {
    try {
      const q = query(collection(db, 'testGroups'));
      const querySnapshot = await getDocs(q);
      const groupsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        order: doc.data().order ?? Number.MAX_SAFE_INTEGER // Order değeri olmayanları en sona koy
      }));
      
      // Order değerine göre sırala
      const sortedGroups = groupsList.sort((a, b) => a.order - b.order);
      setTestGroups(sortedGroups);
    } catch (error) {
      console.error('Error fetching test groups:', error);
    }
  };

  const fetchDealers = async () => {
    try {
      const q = query(collection(db, 'dealers'), where('isActive', '==', true));
      const querySnapshot = await getDocs(q);
      const dealersList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDealers(dealersList);
    } catch (error) {
      console.error('Error fetching dealers:', error);
    }
  };

  const fetchPackages = async () => {
    try {
      const q = query(collection(db, 'packages'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const packagesList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPackages(packagesList);
    } catch (error) {
      console.error('Error fetching packages:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedTest) {
        await updateDoc(doc(db, 'tests', selectedTest.id), {
          ...formData,
          basePrice: Number(formData.basePrice),
          costPrice: Number(formData.costPrice)
        });
      } else {
        await addDoc(collection(db, 'tests'), {
          ...formData,
          basePrice: Number(formData.basePrice),
          costPrice: Number(formData.costPrice),
          createdAt: new Date()
        });
      }
      setIsModalOpen(false);
      setSelectedTest(null);
      setFormData({
        name: '',
        category: '',
        groupId: '',
        basePrice: '',
        costPrice: ''
      });
      fetchTests();
    } catch (error) {
      console.error('Error saving test:', error);
    }
  };

  const handleMoveGroup = async (groupId, direction) => {
    const currentIndex = testGroups.findIndex(g => g.id === groupId);
    if (
      (direction === 'up' && currentIndex === 0) || 
      (direction === 'down' && currentIndex === testGroups.length - 1)
    ) {
      return;
    }

    const newGroups = [...testGroups];
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const [movedGroup] = newGroups.splice(currentIndex, 1);
    newGroups.splice(newIndex, 0, movedGroup);

    try {
      const batch = writeBatch(db);
      newGroups.forEach((group, index) => {
        const groupRef = doc(db, 'testGroups', group.id);
        batch.update(groupRef, { order: index });
      });
      await batch.commit();
      setTestGroups(newGroups);
    } catch (error) {
      console.error('Error updating group order:', error);
      alert('Grup sıralaması güncellenirken bir hata oluştu');
    }
  };

  const handleAddGroup = async (e) => {
    e.preventDefault();
    try {
      const newGroupRef = doc(collection(db, 'testGroups'));
      await setDoc(newGroupRef, {
        title: newGroupTitle,
        createdAt: new Date(),
        order: testGroups.length // Yeni grubu en sona ekle
      });
      setNewGroupTitle('');
      setIsGroupModalOpen(false);
      fetchTestGroups();
    } catch (error) {
      console.error('Error adding test group:', error);
    }
  };

  const handleEdit = (test) => {
    setSelectedTest(test);
    setFormData({
      name: test.name,
      category: test.category,
      groupId: test.groupId,
      basePrice: test.basePrice.toString(),
      costPrice: test.costPrice?.toString() || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (testId) => {
    if (window.confirm('Bu testi silmek istediğinizden emin misiniz?')) {
      try {
        await deleteDoc(doc(db, 'tests', testId));
        fetchTests();
      } catch (error) {
        console.error('Error deleting test:', error);
      }
    }
  };

  const handlePriceChange = (testId, dealerId, price) => {
    setPriceUpdates(prev => ({
      ...prev,
      [`${dealerId}_${testId}`]: price
    }));
  };

  const handlePriceUpdate = async () => {
    try {
      const batch = writeBatch(db);
      
      Object.entries(priceUpdates).forEach(([key, price]) => {
        const [dealerId, testId] = key.split('_');
        const priceRef = doc(db, 'dealerPrices', key);
        
        if (price) {
          batch.set(priceRef, {
            dealerId,
            testId,
            price: Number(price),
            updatedAt: new Date()
          });
        } else {
          batch.delete(priceRef);
        }
      });

      await batch.commit();
      setPriceUpdates({});
      fetchTests();
    } catch (error) {
      console.error('Error updating prices:', error);
    }
  };

  const handleDealerChange = (dealerId) => {
    setSelectedDealer(dealerId);
  };

  const handleDeleteGroup = async (groupId) => {
    if (window.confirm('Bu grubu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      try {
        await deleteDoc(doc(db, 'testGroups', groupId));
        fetchTestGroups();
      } catch (error) {
        console.error('Error deleting group:', error);
      }
    }
  };

  const handleAddPackage = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'packages'), {
        name: newPackageName,
        tests: newPackageTests,
        createdAt: new Date()
      });
      setNewPackageName('');
      setNewPackageTests([]);
      setIsPackageModalOpen(false);
      fetchPackages();
    } catch (error) {
      console.error('Error adding package:', error);
    }
  };

  const handleDeletePackage = async (packageId) => {
    if (window.confirm('Bu paketi silmek istediğinizden emin misiniz?')) {
      try {
        await deleteDoc(doc(db, 'packages', packageId));
        fetchPackages();
      } catch (error) {
        console.error('Error deleting package:', error);
      }
    }
  };

  const handlePackageImageUpload = async (e, packageId) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      setIsUploadingPackage(true)
      setUploadingPackageId(packageId)
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch('https://api.imgbb.com/1/upload?key=48e17415bdf865ecc15389b796c9ec79', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      if (data.success) {
        await updateDoc(doc(db, 'packages', packageId), {
          image: data.data.url
        })
        fetchPackages()
      }
    } catch (error) {
      console.error('Error uploading package image:', error)
      alert('Paket görseli yüklenirken bir hata oluştu')
    } finally {
      setIsUploadingPackage(false)
      setUploadingPackageId(null)
    }
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  console.log(tests);

  return (
    <AdminLayout>
      <div className='space-y-6'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-semibold text-gray-900'>Test Yönetimi</h1>
          <div className='flex space-x-3'>
            <button
              onClick={() => setIsGroupModalOpen(true)}
              className='rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700'
            >
              Yeni Grup Ekle
            </button>
            <button
              onClick={() => {
                setSelectedTest(null);
                setFormData({
                  name: '',
                  category: '',
                  groupId: '',
                  basePrice: '',
                  costPrice: ''
                });
                setIsModalOpen(true);
              }}
              className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700'
            >
              Yeni Test Ekle
            </button>
          </div>
        </div>

        {/* Dealer Selection */}
        <div className='rounded-lg bg-white p-4 shadow'>
          <div className='flex items-center space-x-4'>
            <label className='text-sm font-medium text-gray-700'>Bayi Seçin:</label>
            <select
              value={selectedDealer || ''}
              onChange={(e) => {
                setSelectedDealer(e.target.value);
                setPriceUpdates({});
              }}
              className='mt-1 block w-64 rounded-md border-gray-300 p-2 shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
            >
              <option value=''>Bayi Seçin</option>
              {dealers.map((dealer) => (
                <option key={dealer.id} value={dealer.id}>
                  {dealer.name}
                </option>
              ))}
            </select>
            {selectedDealer && Object.keys(priceUpdates).length > 0 && (
              <button
                onClick={handlePriceUpdate}
                className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700'
              >
                Fiyatları Güncelle
              </button>
            )}
          </div>
        </div>

        {/* Groups List */}
        <div className='rounded-lg bg-white p-4 shadow'>
          <h2 className='mb-4 text-lg font-medium text-gray-900'>Test Grupları</h2>
          <div className='flex flex-wrap gap-2'>
            {testGroups.map((group, index) => (
              <div
                key={group.id}
                className='flex items-center space-x-2 rounded-lg bg-gray-100 px-3 py-2'
              >
                <div className='flex items-center space-x-1'>
                  <button
                    onClick={() => handleMoveGroup(group.id, 'up')}
                    disabled={index === 0}
                    className={`p-1 rounded hover:bg-gray-200 ${
                      index === 0 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleMoveGroup(group.id, 'down')}
                    disabled={index === testGroups.length - 1}
                    className={`p-1 rounded hover:bg-gray-200 ${
                      index === testGroups.length - 1 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                <span className='text-sm font-medium text-gray-700'>{group.title}</span>
                <button
                  onClick={() => handleDeleteGroup(group.id)}
                  className='text-red-600 hover:text-red-900'
                >
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    className='h-4 w-4'
                    viewBox='0 0 20 20'
                    fill='currentColor'
                  >
                    <path
                      fillRule='evenodd'
                      d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z'
                      clipRule='evenodd'
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Tests Table */}
        <div className='overflow-x-auto rounded-lg bg-white shadow'>
          <table className='min-w-full divide-y divide-gray-200'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase'>
                  Test Adı
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase'>
                  Grup
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase'>
                  Geliş Fiyatı
                </th>
                {selectedDealer ? (
                  <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase'>
                    {dealers.find((d) => d.id === selectedDealer)?.name} Fiyatı
                  </th>
                ) : (
                  dealers.map((dealer) => (
                    <th
                      key={dealer.id}
                      className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase'
                    >
                      {dealer.name} Fiyatı
                    </th>
                  ))
                )}
                <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase'>
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-200 bg-white'>
              {tests.map((test) => (
                <tr key={test.id}>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <div className='text-sm font-medium text-gray-900'>{test.name}</div>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <div className='text-sm text-gray-900'>{test.category}</div>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <div className='text-sm text-gray-900'>{test.costPrice || 0} TL</div>
                  </td>
                  {selectedDealer ? (
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center space-x-2'>
                        <span className='text-sm text-gray-500'>
                          <span className='text-xs text-gray-500'>
                            ({test.basePrice}₺ Temel Fiyat)
                          </span>
                          {test.dealerPrices?.[selectedDealer] ? '' : `(${test.basePrice} TL)`}
                        </span>
                        <input
                          type='number'
                          value={
                            priceUpdates[`${selectedDealer}_${test.id}`] !== undefined
                              ? priceUpdates[`${selectedDealer}_${test.id}`]
                              : test.dealerPrices?.[selectedDealer] || ''
                          }
                          onChange={(e) =>
                            handlePriceChange(test.id, selectedDealer, e.target.value)
                          }
                          className='w-24 rounded-md border-gray-300 p-2 shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                          placeholder={test.dealerPrices?.[selectedDealer] || test.basePrice}
                          disabled={!selectedDealer}
                        />
                      </div>
                    </td>
                  ) : (
                    dealers.map((dealer) => (
                      <td key={dealer.id} className='px-6 py-4 whitespace-nowrap'>
                        <div className='flex items-center space-x-2'>
                          <span className='text-xs text-gray-500'>
                            ({test.basePrice}₺ Temel Fiyat)
                          </span>
                          <input
                            type='number'
                            value={
                              priceUpdates[`${dealer.id}_${test.id}`] !== undefined
                                ? priceUpdates[`${dealer.id}_${test.id}`]
                                : test.dealerPrices?.[dealer.id] || ''
                            }
                            onChange={(e) => handlePriceChange(test.id, dealer.id, e.target.value)}
                            className='w-24 rounded-md border-gray-300 p-2 shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                            placeholder={test.dealerPrices?.[dealer.id] || test.basePrice}
                            disabled={!selectedDealer}
                          />
                        </div>
                      </td>
                    ))
                  )}
                  <td className='px-6 py-4 text-sm font-medium whitespace-nowrap'>
                    <button
                      onClick={() => handleEdit(test)}
                      className='mr-4 text-blue-600 hover:text-blue-900'
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={() => handleDelete(test.id)}
                      className='text-red-600 hover:text-red-900'
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Packages List */}
        <div className='rounded-lg bg-white p-4 shadow'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-lg font-medium text-gray-900'>Paketler</h2>
            <button
              onClick={() => setIsPackageModalOpen(true)}
              className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700'
            >
              Yeni Paket Ekle
            </button>
          </div>
          <div className='grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4'>
            {packages.map((pkg) => (
              <div key={pkg.id} className='group relative rounded-lg border border-gray-200 p-3'>
                <div className='aspect-w-16 aspect-h-9 mb-2 overflow-hidden rounded-lg bg-gray-100'>
                  {pkg.image ? (
                    <img
                      src={pkg.image}
                      alt={pkg.name}
                      className='h-60 w-60 object-contain mx-auto'
                    />
                  ) : (
                    <div className='flex h-full items-center justify-center bg-gray-100'>
                      <span className='text-sm text-gray-400'>Görsel Yok</span>
                    </div>
                  )}
                  <input
                    type='file'
                    accept='image/*'
                    onChange={(e) => handlePackageImageUpload(e, pkg.id)}
                    className='hidden'
                    id={`package-image-${pkg.id}`}
                  />
                  <label
                    htmlFor={`package-image-${pkg.id}`}
                    className='absolute inset-0 flex cursor-pointer items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100'
                  >
                    <span className='rounded bg-white px-2 py-1 text-xs text-gray-700'>
                      {isUploadingPackage && uploadingPackageId === pkg.id ? 'Yükleniyor...' : 'Görsel Yükle'}
                    </span>
                  </label>
                </div>
                <div className='flex items-center justify-between'>
                  <div>
                    <h4 className='text-sm font-medium text-gray-900'>{pkg.name}</h4>
                    <p className='text-xs text-gray-500'>{pkg.tests.length} test</p>
                  </div>
                  <button
                    onClick={() => handleDeletePackage(pkg.id)}
                    className='text-red-600 hover:text-red-900'
                  >
                    <svg xmlns='http://www.w3.org/2000/svg' className='h-4 w-4' viewBox='0 0 20 20' fill='currentColor'>
                      <path fillRule='evenodd' d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z' clipRule='evenodd' />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Test Modal */}
      {isModalOpen && (
        <div className='bg-opacity-75 fixed inset-0 flex items-center justify-center bg-gray-500'>
          <div className='w-full max-w-md rounded-lg bg-white p-6'>
            <h2 className='mb-4 text-lg font-medium'>
              {selectedTest ? 'Test Düzenle' : 'Yeni Test Ekle'}
            </h2>
            <form onSubmit={handleSubmit} className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700'>Test Adı</label>
                <input
                  type='text'
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className='mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                  required
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700'>Grup</label>
                <select
                  value={formData.groupId}
                  onChange={(e) => {
                    const selectedGroup = testGroups.find((group) => group.id === e.target.value);
                    setFormData({
                      ...formData,
                      groupId: e.target.value,
                      category: selectedGroup ? selectedGroup.title : '',
                    });
                  }}
                  className='mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                  required
                >
                  <option value=''>Grup Seçin</option>
                  {testGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700'>Temel Fiyat (TL)</label>
                <input
                  type='number'
                  value={formData.basePrice}
                  onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                  className='mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                  required
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700'>Geliş Fiyatı (TL)</label>
                <input
                  type='number'
                  value={formData.costPrice}
                  onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                  className='mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                  required
                />
              </div>
              <div className='flex justify-end space-x-3'>
                <button
                  type='button'
                  onClick={() => setIsModalOpen(false)}
                  className='rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50'
                >
                  İptal
                </button>
                <button
                  type='submit'
                  className='rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700'
                >
                  {selectedTest ? 'Güncelle' : 'Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Group Modal */}
      {isGroupModalOpen && (
        <div className='fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm'>
          <div className='w-full max-w-md rounded-lg bg-white p-6'>
            <h2 className='mb-4 text-lg font-medium'>Yeni Grup Ekle</h2>
            <form onSubmit={handleAddGroup} className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700'>Grup Adı</label>
                <input
                  type='text'
                  value={newGroupTitle}
                  onChange={(e) => setNewGroupTitle(e.target.value)}
                  className='mt-1 block w-full p-2 outline-none focus:ring-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500'
                  required
                />
              </div>
              <div className='flex justify-end space-x-3'>
                <button
                  type='button'
                  onClick={() => setIsGroupModalOpen(false)}
                  className='rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50'
                >
                  İptal
                </button>
                <button
                  type='submit'
                  className='rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700'
                >
                  Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Package Modal */}
      {isPackageModalOpen && (
        <div className='fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50'>
          <div className='w-full max-w-md rounded-lg bg-white p-6'>
            <h2 className='mb-4 text-lg font-medium'>Yeni Paket Ekle</h2>
            <form onSubmit={handleAddPackage} className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700'>Paket Adı</label>
                <input
                  type='text'
                  value={newPackageName}
                  onChange={(e) => setNewPackageName(e.target.value)}
                  className='mt-1 block w-full p-2 outline-none focus:ring-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500'
                  required
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700'>Testler</label>
                <select
                  multiple
                  value={newPackageTests}
                  onChange={(e) => setNewPackageTests(Array.from(e.target.selectedOptions, option => option.value))}
                  className='mt-1 block w-full p-2 outline-none focus:ring-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 h-32'
                  required
                >
                  {tests.map((test) => (
                    <option key={test.id} value={test.name}>
                      {test.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className='flex justify-end space-x-3'>
                <button
                  type='button'
                  onClick={() => setIsPackageModalOpen(false)}
                  className='rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50'
                >
                  İptal
                </button>
                <button
                  type='submit'
                  className='rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700'
                >
                  Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Tests; 