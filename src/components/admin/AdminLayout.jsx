import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  BeakerIcon,
  BanknotesIcon,
  ArrowLeftOnRectangleIcon,
  ArrowUpCircleIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import { collection, query, where, onSnapshot, orderBy, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import Cookies from 'js-cookie';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: HomeIcon },
  { name: 'Başvurular', href: '/admin/applications', icon: ClipboardDocumentListIcon },
  { name: 'Bayiler', href: '/admin/dealers', icon: UserGroupIcon },
  { name: 'Testler', href: '/admin/tests', icon: BeakerIcon },
  { name: 'Finans', href: '/admin/finance', icon: BanknotesIcon },
  { name: 'Test Sıralaması', href: '/admin/test-order', icon: ArrowUpCircleIcon },
];

const NOTIFICATIONS_COOKIE = 'admin_notifications';
const UNREAD_COUNT_COOKIE = 'admin_unread_count';

const formatDate = (date) => {
  if (!date) return '';
  if (typeof date === 'string') {
    return new Date(date).toLocaleString('tr-TR');
  }
  if (date instanceof Timestamp) {
    return date.toDate().toLocaleString('tr-TR');
  }
  return date.toLocaleString('tr-TR');
};

const AdminLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState(() => {
    const savedNotifications = Cookies.get(NOTIFICATIONS_COOKIE);
    return savedNotifications ? JSON.parse(savedNotifications) : [];
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(() => {
    const savedCount = Cookies.get(UNREAD_COUNT_COOKIE);
    return savedCount ? parseInt(savedCount) : 0;
  });
  const location = useLocation();

  // Save notifications to cookie whenever they change
  useEffect(() => {
    Cookies.set(NOTIFICATIONS_COOKIE, JSON.stringify(notifications), { 
      expires: 7,
      secure: true,
      sameSite: 'strict'
    });
  }, [notifications]);

  // Save unread count to cookie whenever it changes
  useEffect(() => {
    Cookies.set(UNREAD_COUNT_COOKIE, unreadCount.toString(), {
      expires: 7,
      secure: true,
      sameSite: 'strict'
    });
  }, [unreadCount]);

  useEffect(() => {
    // Son 24 saatteki yeni başvuruları dinle
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    const q = query(
      collection(db, 'applications'),
      where('createdAt', '>=', last24Hours),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newNotifications = snapshot.docChanges()
        .filter(change => change.type === 'added')
        .map(change => ({
          id: change.doc.id,
          ...change.doc.data(),
          isRead: change.doc.data().read || false,
          createdAt: change.doc.data().createdAt.toDate().toISOString()
        }));

      if (newNotifications.length > 0) {
        // Sadece okunmamış bildirimleri göster
        const unreadNotifications = newNotifications.filter(n => !n.isRead);
        
        if (unreadNotifications.length > 0) {
          setNotifications(prev => {
            const existingIds = new Set(prev.map(n => n.id));
            const uniqueNewNotifications = unreadNotifications.filter(n => !existingIds.has(n.id));
            return [...uniqueNewNotifications, ...prev];
          });
          setUnreadCount(prev => prev + unreadNotifications.length);
          
          // Bildirim sesi çal
          const audio = new Audio('/notification.mp3');
          audio.play().catch(() => {});
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const markAsRead = async (notificationId) => {
    try {
      // Firestore'da başvuruyu okundu olarak işaretle
      await updateDoc(doc(db, 'applications', notificationId), {
        read: true,
        updatedAt: new Date()
      });

      // Bildirimleri güncelle
      setNotifications(prev => {
        const updatedNotifications = prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification
        );
        return updatedNotifications;
      });
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      // Tüm okunmamış bildirimleri Firestore'da güncelle
      const unreadNotifications = notifications.filter(n => !n.isRead);
      const updatePromises = unreadNotifications.map(notification =>
        updateDoc(doc(db, 'applications', notification.id), {
          read: true,
          updatedAt: new Date()
        })
      );
      await Promise.all(updatePromises);

      // Bildirimleri güncelle
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, isRead: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 bg-blue-600">
            <h1 className="text-xl font-bold text-white">OgzMed</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                  {item.name === 'Başvurular' && unreadCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t">
            <button
              className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50"
              onClick={() => {/* Add logout logic */}}
            >
              <ArrowLeftOnRectangleIcon className="w-5 h-5 mr-3" />
              Çıkış Yap
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`${isSidebarOpen ? 'ml-64' : 'ml-0'} transition-all duration-300 ease-in-out`}>
        {/* Top Bar */}
        <div className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 bg-white shadow-sm">
          <button
            className="p-2 text-gray-500 rounded-lg hover:bg-gray-100"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              className="p-2 text-gray-500 rounded-lg hover:bg-gray-100 relative"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <BellIcon className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-red-500 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg overflow-hidden z-50">
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Bildirimler</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Tümünü Okundu İşaretle
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      Yeni bildirim yok
                    </div>
                  ) : (
                    notifications.map(notification => (
                      <div
                        key={`${notification.id}-${notification.createdAt}`}
                        className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                          !notification.isRead ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="flex items-start">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              Yeni Başvuru
                            </p>
                            <p className="text-sm text-gray-500">
                              {notification.patientInfo.name}
                            </p>
                            <p className="text-xs text-gray-400">
                              {formatDate(notification.createdAt)}
                            </p>
                          </div>
                          {!notification.isRead && (
                            <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full"></span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout; 