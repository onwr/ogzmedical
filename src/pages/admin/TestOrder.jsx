import { useState, useEffect } from 'react'
import { collection, query, orderBy, getDocs, doc, writeBatch, where } from 'firebase/firestore'
import { db } from '../../config/firebase'
import AdminLayout from '../../components/admin/AdminLayout'

const TestOrder = () => {
  const [testGroups, setTestGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [tests, setTests] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchTestGroups()
  }, [])

  useEffect(() => {
    if (selectedGroup) {
      fetchTests(selectedGroup)
    }
  }, [selectedGroup])

  const fetchTestGroups = async () => {
    try {
      const q = query(collection(db, 'testGroups'), orderBy('order'))
      const querySnapshot = await getDocs(q)
      const groupsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setTestGroups(groupsList)
      setIsLoading(false)
    } catch (error) {
      console.error('Error fetching test groups:', error)
    }
  }

  const fetchTests = async (groupId) => {
    try {
      const q = query(
        collection(db, 'tests'),
        where('groupId', '==', groupId)
      )
      const querySnapshot = await getDocs(q)
      let testsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      // Eğer testlerin order değeri yoksa, otomatik olarak ekle
      const needsOrderUpdate = testsList.some(test => test.order === undefined)
      if (needsOrderUpdate) {
        const batch = writeBatch(db)
        testsList = testsList.map((test, index) => {
          const testRef = doc(db, 'tests', test.id)
          batch.update(testRef, { order: index })
          return { ...test, order: index }
        })
        await batch.commit()
      }

      // Order'a göre sırala
      testsList.sort((a, b) => (a.order || 0) - (b.order || 0))
      setTests(testsList)
    } catch (error) {
      console.error('Error fetching tests:', error)
    }
  }

  const handleMoveTest = async (testId, direction) => {
    const currentIndex = tests.findIndex(t => t.id === testId)
    if (
      (direction === 'up' && currentIndex === 0) || 
      (direction === 'down' && currentIndex === tests.length - 1)
    ) {
      return
    }

    const newTests = [...tests]
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    const [movedTest] = newTests.splice(currentIndex, 1)
    newTests.splice(newIndex, 0, movedTest)

    try {
      const batch = writeBatch(db)
      newTests.forEach((test, index) => {
        const testRef = doc(db, 'tests', test.id)
        batch.update(testRef, { order: index })
      })
      await batch.commit()
      setTests(newTests)
    } catch (error) {
      console.error('Error updating test order:', error)
      alert('Test sıralaması güncellenirken bir hata oluştu')
    }
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-semibold text-gray-900'>Test Sıralama</h1>
        </div>

        {/* Group Selection */}
        <div className='rounded-lg bg-white p-4 shadow'>
          <h2 className='mb-4 text-lg font-medium text-gray-900'>Grup Seçin</h2>
          <div className='flex flex-wrap gap-2'>
            {testGroups.map((group) => (
              <button
                key={group.id}
                onClick={() => setSelectedGroup(group.id)}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${
                  selectedGroup === group.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {group.title}
              </button>
            ))}
          </div>
        </div>

        {/* Tests List */}
        {selectedGroup && (
          <div className='rounded-lg bg-white p-4 shadow'>
            <h2 className='mb-4 text-lg font-medium text-gray-900'>
              {testGroups.find(g => g.id === selectedGroup)?.title} Testleri
            </h2>
            <div className='space-y-2 grid grid-cols-3 gap-2'>
              {tests.map((test, index) => (
                <div
                  key={test.id}
                  className='flex items-center justify-between rounded-lg border border-gray-200 p-3'
                >
                  <span className='text-sm font-medium text-gray-700'>{test.name}</span>
                  <div className='flex items-center space-x-2'>
                    <button
                      onClick={() => handleMoveTest(test.id, 'up')}
                      disabled={index === 0}
                      className={`p-1 rounded hover:bg-gray-100 ${
                        index === 0 ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleMoveTest(test.id, 'down')}
                      disabled={index === tests.length - 1}
                      className={`p-1 rounded hover:bg-gray-100 ${
                        index === tests.length - 1 ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default TestOrder 