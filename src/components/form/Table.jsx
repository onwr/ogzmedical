import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs, addDoc, getDoc, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../config/firebase'
import Header from '@components/Header'


const COOKIE_KEY = 'selectedTests'

const getCookie = (name) => {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop().split(';').shift()
  return null
}

const setCookie = (name, value, days = 30) => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`
}

const Table = ({ application }) => {
  const { dealerId } = useParams()
  const navigate = useNavigate()
  const [testGroups, setTestGroups] = useState([])
  const [packages, setPackages] = useState([])
  const [selectedTests, setSelectedTests] = useState({})
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [dealer, setDealer] = useState(null)
  const [patientInfo, setPatientInfo] = useState({
    name: '',
    birthDate: '',
    requestDate: '',
    tcNo: '',
    gender: '',
    phone: '',
    email: ''
  })

  useEffect(() => {
    if (application) {
      setPatientInfo(application.patientInfo)
      // Seçili testleri ayarla
      const newSelectedTests = {}
      testGroups.forEach((group, groupIndex) => {
        group.tests.forEach((test, testIndex) => {
          if (application.selectedTests.some(selectedTest => selectedTest.testId === test.id)) {
            newSelectedTests[`${groupIndex}-${testIndex}`] = true
          }
        })
      })
      setSelectedTests(newSelectedTests)
    }
  }, [application, testGroups])

  useEffect(() => {
    if (dealerId) {
      fetchDealer()
    }
    fetchTestGroups()
    fetchPackages()
  }, [dealerId])

  const fetchDealer = async () => {
    try {
      const dealerDoc = await getDoc(doc(db, 'dealers', dealerId))
      if (dealerDoc.exists()) {
        setDealer({ id: dealerDoc.id, ...dealerDoc.data() })
      } else {
        console.error('Dealer not found')
        alert('Bayi bilgisi bulunamadı')
      }
    } catch (error) {
      console.error('Error fetching dealer:', error)
      alert('Bayi bilgisi alınırken bir hata oluştu')
    }
  }

  const fetchTestGroups = async () => {
    try {
      const groupsQuery = query(collection(db, 'testGroups'))
      const groupsSnapshot = await getDocs(groupsQuery)
      const groups = []

      for (const groupDoc of groupsSnapshot.docs) {
        const testsQuery = query(
          collection(db, 'tests'),
          where('groupId', '==', groupDoc.id)
        )
        const testsSnapshot = await getDocs(testsQuery)
        const tests = testsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        groups.push({
          id: groupDoc.id,
          title: groupDoc.data().title,
          tests
        })
      }

      setTestGroups(groups)
    } catch (error) {
      console.error('Error fetching test groups:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPackages = async () => {
    try {
      const packagesQuery = query(collection(db, 'packages'))
      const packagesSnapshot = await getDocs(packagesQuery)
      const packagesList = packagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setPackages(packagesList)
    } catch (error) {
      console.error('Error fetching packages:', error)
    }
  }

  const handleCheckboxChange = (groupIndex, testIndex) => {
    const key = `${groupIndex}-${testIndex}`
    setSelectedTests(prev => {
      const newState = { ...prev }
      if (newState[key]) {
        delete newState[key]
      } else {
        newState[key] = true
      }
      return newState
    })
  }

  const handleSelectPackage = (packageTests) => {
    const newSelectedTests = {}
    testGroups.forEach((group, groupIndex) => {
      group.tests.forEach((test, testIndex) => {
        if (packageTests.includes(test.name)) {
          newSelectedTests[`${groupIndex}-${testIndex}`] = true
        }
      })
    })
    setSelectedTests(newSelectedTests)
    setIsModalOpen(false)
  }

  const calculateTotalPrice = () => {
    let total = 0
    Object.keys(selectedTests).forEach(key => {
      const [groupIndex, testIndex] = key.split('-').map(Number)
      const test = testGroups[groupIndex].tests[testIndex]
      total += test.price
    })
    return total
  }

  const handleCreateApplication = async () => {
    if (!patientInfo.name || !patientInfo.tcNo || !patientInfo.birthDate || !patientInfo.gender) {
      alert('Lütfen hasta bilgilerini eksiksiz doldurun')
      return
    }

    if (Object.keys(selectedTests).length === 0) {
      alert('Lütfen en az bir test seçin')
      return
    }

    if (!dealer && !application) {
      alert('Bayi bilgisi bulunamadı. Lütfen sayfayı yenileyip tekrar deneyin.')
      return
    }

    try {
      const selectedTestsList = Object.keys(selectedTests).map(key => {
        const [groupIndex, testIndex] = key.split('-').map(Number)
        const test = testGroups[groupIndex].tests[testIndex]
        return {
          testId: test.id,
          name: test.name,
          price: test.price
        }
      })

      const applicationData = {
        patientInfo,
        selectedTests: selectedTestsList,
        totalPrice: calculateTotalPrice(),
        status: 'pending',
        updatedAt: new Date()
      }

      if (application) {
        // Düzenleme modu
        applicationData.dealerId = application.dealerId
        applicationData.dealerName = application.dealerName
        await updateDoc(doc(db, 'applications', application.id), applicationData)
        alert('Başvuru başarıyla güncellendi')
        navigate('/admin/applications')
      } else {
        // Yeni başvuru
        applicationData.dealerId = dealer.id
        applicationData.dealerName = dealer.name || 'Bilinmeyen Bayi'
        applicationData.createdAt = new Date()
        await addDoc(collection(db, 'applications'), applicationData)
        alert('Başvuru başarıyla oluşturuldu')
      }
      
      // Reset form
      setSelectedTests({})
      setPatientInfo({
        name: '',
        birthDate: '',
        requestDate: '',
        tcNo: '',
        gender: '',
        phone: '',
        email: ''
      })
    } catch (error) {
      console.error('Error creating/updating application:', error)
      alert('Başvuru oluşturulurken bir hata oluştu')
    }
  }

  const handlePatientInfoChange = (newPatientInfo) => {
    setPatientInfo(prev => ({ ...prev, ...newPatientInfo }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <>
      <Header onPatientInfoChange={handlePatientInfoChange} initialValues={patientInfo} />

      <div>
        <div className='rounded-lg bg-white py-0 px-2 shadow'>
          <div className='mb-1 flex items-center justify-between'>
            <button
              onClick={() => setIsModalOpen(true)}
              className='rounded-sm md:rounded-lg bg-blue-600 px-4 py-0.5 md:py-2 text-[7px] md:text-sm font-medium text-white hover:bg-blue-700'
            >
              Paket Seç
            </button>
          </div>

          {isModalOpen && (
            <div className='bg-opacity-30 fixed inset-0 z-50 flex items-center justify-center bg-black/30'>
              <div className='flex min-w-[220px] flex-col gap-2 rounded bg-white p-4 shadow-lg'>
                <div className='mb-2 text-xs font-bold text-gray-700'>Paket Seç</div>
                {packages.map((pkg) => (
                  <button
                    key={pkg.id}
                    className='w-full rounded border border-blue-200 px-2 py-1 text-left text-xs text-blue-700 hover:bg-blue-100'
                    onClick={() => handleSelectPackage(pkg.tests)}
                  >
                    {pkg.name}
                  </button>
                ))}
                <button
                  className='mt-2 text-xs text-gray-500 hover:text-blue-600'
                  onClick={() => setIsModalOpen(false)}
                >
                  Kapat
                </button>
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
                    const checked = !!selectedTests[`${groupIndex}-${testIndex}`]
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
                        <span className='truncate'>{test.name}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Total and Submit */}
        <div className='rounded-lg bg-white p-1'>
          <div className='flex items-center justify-between'>
            <div className='text-xs font-medium'>
              Toplam Tutar: <span className='text-blue-600'>{calculateTotalPrice()} TL</span>
            </div>
            <button
              onClick={handleCreateApplication}
              className='rounded-sm md:rounded-lg bg-blue-600 px-6 py-1 md:py-2 text-xs md:text-sm font-medium text-white hover:bg-blue-700'
            >
              {application ? 'Başvuruyu Güncelle' : 'Başvuru Oluştur'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default Table