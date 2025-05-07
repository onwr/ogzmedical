import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, writeBatch, where } from 'firebase/firestore';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { db } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import { GripVertical } from 'lucide-react';

// SortableItem component for each test
const SortableItem = ({ id, name, index }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 999 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`mb-2 flex items-center justify-between rounded-lg border p-4 ${
        isDragging
          ? 'border-blue-500 bg-blue-50 shadow-lg'
          : 'border-gray-200 bg-white hover:bg-gray-50'
      }`}
    >
      <div className='flex items-center gap-3'>
        <span className='flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-700'>
          {index + 1}
        </span>
        <span className='font-medium text-gray-800'>{name}</span>
      </div>
      <div
        {...attributes}
        {...listeners}
        className='cursor-grab rounded p-1 hover:bg-gray-100 active:cursor-grabbing'
      >
        <GripVertical className='h-5 w-5 text-gray-400' />
      </div>
    </div>
  );
};

const TestOrder = () => {
  const [testGroups, setTestGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [tests, setTests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Initialize sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Minimum distance before drag starts - prevents accidental drags
      },
    }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    fetchTestGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      fetchTests(selectedGroup);
    }
  }, [selectedGroup]);

  const fetchTestGroups = async () => {
    try {
      const q = query(collection(db, 'testGroups'), orderBy('order'));
      const querySnapshot = await getDocs(q);
      const groupsList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTestGroups(groupsList);
      setIsLoading(false);

      // Auto-select first group if available
      if (groupsList.length > 0 && !selectedGroup) {
        setSelectedGroup(groupsList[0].id);
      }
    } catch (error) {
      console.error('Error fetching test groups:', error);
      setStatusMessage('Gruplar yüklenirken bir hata oluştu.');
    }
  };

  const fetchTests = async (groupId) => {
    try {
      setIsLoading(true);
      setStatusMessage('Testler yükleniyor...');

      const q = query(collection(db, 'tests'), where('groupId', '==', groupId));
      const querySnapshot = await getDocs(q);
      let testsList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Add order property if it doesn't exist
      const needsOrderUpdate = testsList.some((test) => test.order === undefined);
      if (needsOrderUpdate) {
        const batch = writeBatch(db);
        testsList = testsList.map((test, index) => {
          const testRef = doc(db, 'tests', test.id);
          batch.update(testRef, { order: index });
          return { ...test, order: index };
        });
        await batch.commit();
        setStatusMessage('Test sıralaması otomatik olarak ayarlandı.');
      }

      // Sort by order
      testsList.sort((a, b) => (a.order || 0) - (b.order || 0));
      setTests(testsList);
      setHasChanges(false);
      setIsLoading(false);
      setStatusMessage('');
    } catch (error) {
      console.error('Error fetching tests:', error);
      setIsLoading(false);
      setStatusMessage('Testler yüklenirken bir hata oluştu.');
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    setTests((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
        ...item,
        order: index,
      }));

      setHasChanges(true);
      return newItems;
    });
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setStatusMessage('Değişiklikler kaydediliyor...');

      const batch = writeBatch(db);
      tests.forEach((test) => {
        const testRef = doc(db, 'tests', test.id);
        batch.update(testRef, { order: test.order });
      });

      await batch.commit();
      setHasChanges(false);
      setIsSaving(false);
      setStatusMessage('Değişiklikler başarıyla kaydedildi!');

      // Clear success message after 3 seconds
      setTimeout(() => {
        if (setStatusMessage('Değişiklikler başarıyla kaydedildi!')) {
          setStatusMessage('');
        }
      }, 3000);
    } catch (error) {
      console.error('Error updating test order:', error);
      setIsSaving(false);
      setStatusMessage('Değişiklikler kaydedilirken bir hata oluştu!');
    }
  };

  return (
    <AdminLayout>
      <div className='mx-auto max-w-4xl space-y-6 p-4'>
        <div className='flex flex-col justify-between gap-4 sm:flex-row sm:items-center'>
          <h1 className='text-2xl font-bold text-gray-900'>Test Sıralama</h1>
          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className='flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:bg-blue-300'
            >
              {isSaving ? (
                <>
                  <svg
                    className='mr-2 -ml-1 h-4 w-4 animate-spin text-white'
                    xmlns='http://www.w3.org/2000/svg'
                    fill='none'
                    viewBox='0 0 24 24'
                  >
                    <circle
                      className='opacity-25'
                      cx='12'
                      cy='12'
                      r='10'
                      stroke='currentColor'
                      strokeWidth='4'
                    ></circle>
                    <path
                      className='opacity-75'
                      fill='currentColor'
                      d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                    ></path>
                  </svg>
                  Kaydediliyor...
                </>
              ) : (
                'Değişiklikleri Kaydet'
              )}
            </button>
          )}
        </div>

        {statusMessage && (
          <div
            className={`rounded-lg p-3 ${
              statusMessage.includes('hata')
                ? 'bg-red-100 text-red-700'
                : statusMessage.includes('başarıyla')
                  ? 'bg-green-100 text-green-700'
                  : 'bg-blue-100 text-blue-700'
            }`}
          >
            {statusMessage}
          </div>
        )}

        {/* Group Selection */}
        <div className='rounded-lg bg-white p-4 shadow'>
          <h2 className='mb-4 text-lg font-medium text-gray-900'>Grup Seçin</h2>
          <div className='flex flex-wrap gap-2'>
            {testGroups.map((group) => (
              <button
                key={group.id}
                onClick={() => setSelectedGroup(group.id)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
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

        {/* Tests List with DnD */}
        {selectedGroup && (
          <div className='rounded-lg bg-white p-4 shadow'>
            <h2 className='mb-4 text-lg font-medium text-gray-900'>
              {testGroups.find((g) => g.id === selectedGroup)?.title || ''} Testleri
            </h2>

            <div className='mb-2 text-sm text-gray-500'>
              Testleri sıralamak için sürükleyip bırakın. Sağdaki tutamaçları kullanarak istediğiniz
              konuma taşıyabilirsiniz.
            </div>

            {isLoading ? (
              <div className='flex h-32 items-center justify-center'>
                <div className='h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-blue-600'></div>
              </div>
            ) : tests.length === 0 ? (
              <p className='py-6 text-center text-gray-500'>Bu grupta test bulunamadı.</p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              >
                <div className='rounded-lg border border-gray-200 bg-gray-50 p-4'>
                  <SortableContext
                    items={tests.map((test) => test.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {tests.map((test, index) => (
                      <SortableItem key={test.id} id={test.id} name={test.name} index={index} />
                    ))}
                  </SortableContext>
                </div>
              </DndContext>
            )}

            {hasChanges && (
              <div className='mt-4 flex justify-end'>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className='rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:bg-blue-300'
                >
                  {isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default TestOrder;
