import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, orderBy, limit, startAfter, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const BATCH_SIZE = 50; // Number of records to fetch per batch

const Finance = () => {
  const [financialData, setFinancialData] = useState({
    daily: [],
    monthly: [],
    categoryBased: [],
    testBased: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('month');
  const [selectedDealer, setSelectedDealer] = useState('all');
  const [dealers, setDealers] = useState([]);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    profitMargin: 0
  });
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [cache, setCache] = useState({
    dealers: { data: null, timestamp: 0 },
    financials: { data: null, timestamp: 0 }
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categories, setCategories] = useState([
    { id: 'patient_payment', name: 'Hasta Ödemesi', type: 'income' },
    { id: 'test_cost', name: 'Maliyet', type: 'expense' }
  ]);
  const [newCategory, setNewCategory] = useState({ name: '', type: 'income' });
  const [newRecord, setNewRecord] = useState({
    category: 'patient_payment',
    amount: '',
    testId: '',
    testName: '',
    description: ''
  });
  const [tests, setTests] = useState([]);

  const fetchDealers = useCallback(async () => {
    try {
      // Check cache first
      if (cache.dealers.data && Date.now() - cache.dealers.timestamp < CACHE_DURATION) {
        setDealers(cache.dealers.data);
        return;
      }

      const q = query(
        collection(db, 'dealers'),
        where('isActive', '==', true),
        limit(100)
      );
      const querySnapshot = await getDocs(q);
      const dealersList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Update cache
      setCache(prev => ({
        ...prev,
        dealers: { data: dealersList, timestamp: Date.now() }
      }));
      setDealers(dealersList);
    } catch (error) {
      console.error('Error fetching dealers:', error);
    }
  }, [cache]);

  const fetchFinancialData = useCallback(async (isInitial = true) => {
    try {
      if (isInitial) {
        setIsLoading(true);
        setLastDoc(null);
        setHasMore(true);
      }

      // Check cache for initial load
      if (isInitial && cache.financials.data && Date.now() - cache.financials.timestamp < CACHE_DURATION) {
        setFinancialData(cache.financials.data);
        calculateSummary(cache.financials.data);
        setIsLoading(false);
        return;
      }

      const startDate = new Date();
      if (dateRange === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (dateRange === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (dateRange === 'year') {
        startDate.setFullYear(startDate.getFullYear() - 1);
      }

      let q = query(
        collection(db, 'applications'),
        orderBy('updatedAt', 'desc'),
        limit(BATCH_SIZE)
      );

      if (!isInitial && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setHasMore(false);
        setIsLoading(false);
        return;
      }

      const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
      setLastDoc(lastVisible);

      const newData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log('Fetched financial data:', newData);

      if (isInitial) {
        const processedData = processFinancialData(newData);
        console.log('Processed financial data:', processedData);
        setFinancialData(processedData);
        calculateSummary(processedData);
        
        // Update cache
        setCache(prev => ({
          ...prev,
          financials: { data: processedData, timestamp: Date.now() }
        }));
      } else {
        setFinancialData(prev => {
          const combinedData = [...prev.daily, ...newData];
          const processedData = processFinancialData(combinedData);
          calculateSummary(processedData);
          return processedData;
        });
      }

      setHasMore(querySnapshot.docs.length === BATCH_SIZE);
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, lastDoc, cache]);

  useEffect(() => {
    fetchDealers();
    fetchFinancialData(true);
  }, [dateRange, selectedDealer, fetchDealers, fetchFinancialData]);

  const processFinancialData = (applications) => {
    // Group by date for daily view
    const dailyData = applications.reduce((acc, app) => {
      const date = app.updatedAt.toDate().toLocaleDateString();
      if (!acc[date]) {
        acc[date] = { revenue: 0, cost: 0, profit: 0 };
      }
      
      acc[date].revenue += app.totalPrice;
      acc[date].cost += app.totalCost;
      acc[date].profit += app.profit;
      
      return acc;
    }, {});

    // Group by month for monthly view
    const monthlyData = applications.reduce((acc, app) => {
      const month = app.updatedAt.toDate().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
      if (!acc[month]) {
        acc[month] = { revenue: 0, cost: 0, profit: 0 };
      }
      
      acc[month].revenue += app.totalPrice;
      acc[month].cost += app.totalCost;
      acc[month].profit += app.profit;
      
      return acc;
    }, {});

    // Group by test for test-based view
    const testData = applications.reduce((acc, app) => {
      app.selectedTests.forEach(test => {
        if (!acc[test.name]) {
          acc[test.name] = {
            revenue: 0,
            cost: 0,
            profit: 0
          };
        }
        
        acc[test.name].revenue += test.price;
        acc[test.name].cost += test.costPrice;
        acc[test.name].profit += (test.price - test.costPrice);
      });
      
      return acc;
    }, {});

    return {
      daily: Object.entries(dailyData).map(([date, values]) => ({
        date,
        ...values
      })),
      monthly: Object.entries(monthlyData).map(([month, values]) => ({
        month,
        ...values
      })),
      testBased: Object.entries(testData).map(([testName, values]) => ({
        testName,
        ...values
      }))
    };
  };

  const calculateSummary = (data) => {
    const totalRevenue = data.monthly.reduce((sum, month) => sum + month.revenue, 0);
    const totalCost = data.monthly.reduce((sum, month) => sum + month.cost, 0);
    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    setSummary({
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin
    });
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet([
      {
        'Dönem': dateRange === 'week' ? 'Son 7 Gün' : dateRange === 'month' ? 'Son 30 Gün' : 'Son 1 Yıl',
        'Toplam Gelir': summary.totalRevenue,
        'Toplam Maliyet': summary.totalCost,
        'Kar': summary.totalProfit,
        'Kar Marjı (%)': summary.profitMargin.toFixed(2)
      },
      ...financialData.daily.map(day => ({
        'Tarih': day.date,
        'Gelir': day.revenue,
        'Maliyet': day.cost,
        'Kar': day.profit
      }))
    ]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Finansal Rapor');
    XLSX.writeFile(workbook, 'finansal_rapor.xlsx');
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text('Finansal Rapor', 14, 15);
    
    // Add summary
    doc.setFontSize(12);
    doc.text(`Dönem: ${dateRange === 'week' ? 'Son 7 Gün' : dateRange === 'month' ? 'Son 30 Gün' : 'Son 1 Yıl'}`, 14, 25);
    doc.text(`Toplam Gelir: ${summary.totalRevenue.toLocaleString('tr-TR')} TL`, 14, 35);
    doc.text(`Toplam Maliyet: ${summary.totalCost.toLocaleString('tr-TR')} TL`, 14, 45);
    doc.text(`Kar: ${summary.totalProfit.toLocaleString('tr-TR')} TL`, 14, 55);
    doc.text(`Kar Marjı: %${summary.profitMargin.toFixed(2)}`, 14, 65);

    // Add daily data table
    const tableData = financialData.daily.map(day => [
      day.date,
      day.revenue.toLocaleString('tr-TR'),
      day.cost.toLocaleString('tr-TR'),
      day.profit.toLocaleString('tr-TR')
    ]);

    doc.autoTable({
      startY: 75,
      head: [['Tarih', 'Gelir', 'Maliyet', 'Kar']],
      body: tableData,
    });

    doc.save('finansal_rapor.pdf');
  };

  const chartData = {
    daily: {
      labels: financialData.daily?.map(item => item.date) || [],
      datasets: [
        {
          label: 'Gelir',
          data: financialData.daily?.map(item => item.revenue) || [],
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.5)',
        },
        {
          label: 'Gider',
          data: financialData.daily?.map(item => item.cost) || [],
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.5)',
        },
        {
          label: 'Kar',
          data: financialData.daily?.map(item => item.profit) || [],
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
        },
      ],
    },
    monthly: {
      labels: financialData.monthly?.map(item => item.month) || [],
      datasets: [
        {
          label: 'Gelir',
          data: financialData.monthly?.map(item => item.revenue) || [],
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.5)',
        },
        {
          label: 'Gider',
          data: financialData.monthly?.map(item => item.cost) || [],
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.5)',
        },
        {
          label: 'Kar',
          data: financialData.monthly?.map(item => item.profit) || [],
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
        },
      ],
    },
    categoryBased: {
      labels: financialData.categoryBased?.map(item => item.name) || [],
      datasets: [
        {
          label: 'Tutar',
          data: financialData.categoryBased?.map(item => item.amount) || [],
          backgroundColor: financialData.categoryBased?.map(item => 
            item.type === 'income' ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'
          ) || [],
        },
      ],
    },
    testBased: {
      labels: financialData.testBased?.map(item => item.testName) || [],
      datasets: [
        {
          label: 'Gelir',
          data: financialData.testBased?.map(item => item.revenue) || [],
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.5)',
        },
        {
          label: 'Maliyet',
          data: financialData.testBased?.map(item => item.cost) || [],
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.5)',
        },
        {
          label: 'Kar',
          data: financialData.testBased?.map(item => item.profit) || [],
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
        },
      ],
    },
  };

  // Fetch tests for the dropdown
  useEffect(() => {
    const fetchTests = async () => {
      try {
        const q = query(collection(db, 'tests'));
        const querySnapshot = await getDocs(q);
        const testsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTests(testsList);
      } catch (error) {
        console.error('Error fetching tests:', error);
      }
    };

    fetchTests();
  }, []);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    try {
      const categoryId = newCategory.name.toLowerCase().replace(/\s+/g, '_');
      const categoryExists = categories.some(cat => cat.id === categoryId);
      
      if (categoryExists) {
        alert('Bu kategori zaten mevcut!');
        return;
      }

      const newCategoryData = {
        id: categoryId,
        name: newCategory.name,
        type: newCategory.type
      };

      setCategories(prev => [...prev, newCategoryData]);
      setNewCategory({ name: '', type: 'income' });
      setShowCategoryForm(false);
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Kategori eklenirken bir hata oluştu');
    }
  };

  const handleAddRecord = async (e) => {
    e.preventDefault();
    try {
      const recordData = {
        ...newRecord,
        amount: parseFloat(newRecord.amount),
        date: serverTimestamp(),
        createdAt: serverTimestamp()
      };

      // Test bilgilerini sadece seçilmişse ekle
      if (!recordData.testId) {
        delete recordData.testId;
        delete recordData.testName;
      }

      await addDoc(collection(db, 'financials'), recordData);
      
      // Reset form and close modal
      setNewRecord({
        category: 'patient_payment',
        amount: '',
        testId: '',
        testName: '',
        description: ''
      });
      setShowAddForm(false);
      
      // Refresh data
      fetchFinancialData(true);
    } catch (error) {
      console.error('Error adding financial record:', error);
      alert('Finans kaydı eklenirken bir hata oluştu');
    }
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
          <h1 className="text-2xl font-semibold text-gray-900">Finans</h1>
          <div className="flex space-x-4">
            <button
              onClick={exportToExcel}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Excel
            </button>
            <button
              onClick={exportToPDF}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              PDF
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Yeni Kayıt Ekle
            </button>
          </div>
        </div>

        {/* Add Category Modal */}
        {showCategoryForm && (
          <div className="fixed inset-0 bg-gray-600/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Yeni Kategori Ekle</h3>
                <button
                  onClick={() => setShowCategoryForm(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleAddCategory} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Kategori Adı</label>
                  <input
                    type="text"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    className="mt-1 p-2 outline-none focus:ring-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Kategori Tipi</label>
                  <select
                    value={newCategory.type}
                    onChange={(e) => setNewCategory({ ...newCategory, type: e.target.value })}
                    className="mt-1 p-2 outline-none focus:ring-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    <option value="income">Gelir</option>
                    <option value="expense">Gider</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCategoryForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Kaydet
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Record Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-gray-600/50 backdrop-blur-sm overflow-y-auto h-full w-full z-20">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Yeni Finans Kaydı</h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleAddRecord} className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">Kategori</label>
                    <button
                      type="button"
                      onClick={() => setShowCategoryForm(true)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      + Yeni Kategori
                    </button>
                  </div>
                  <select
                    value={newRecord.category}
                    onChange={(e) => setNewRecord({ ...newRecord, category: e.target.value })}
                    className="mt-1 p-2 outline-none focus:ring-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tutar</label>
                  <input
                    type="number"
                    value={newRecord.amount}
                    onChange={(e) => setNewRecord({ ...newRecord, amount: e.target.value })}
                    className="mt-1 p-2 outline-none focus:ring-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="0.00"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Açıklama</label>
                  <textarea
                    value={newRecord.description}
                    onChange={(e) => setNewRecord({ ...newRecord, description: e.target.value })}
                    className="mt-1 p-2 outline-none focus:ring-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    rows="3"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Kaydet
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">Toplam Gelir</h3>
            <p className="mt-2 text-3xl font-semibold text-green-600">
              {summary.totalRevenue.toLocaleString('tr-TR')} TL
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">Toplam Maliyet</h3>
            <p className="mt-2 text-3xl font-semibold text-red-600">
              {summary.totalCost.toLocaleString('tr-TR')} TL
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">Toplam Kar</h3>
            <p className="mt-2 text-3xl font-semibold text-blue-600">
              {summary.totalProfit.toLocaleString('tr-TR')} TL
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">Kar Marjı</h3>
            <p className="mt-2 text-3xl font-semibold text-blue-600">
              %{summary.profitMargin.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Günlük Gelir/Maliyet/Kar</h3>
            <Line data={chartData.daily} />
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Aylık Gelir/Maliyet/Kar</h3>
            <Line data={chartData.monthly} />
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Test Bazlı Gelir/Maliyet/Kar</h3>
            <Bar data={chartData.testBased} />
          </div>
        </div>

        {/* Test-based Financial Data */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-medium text-gray-900">Test Bazlı Finansal Durum</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Test Adı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gelir
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Maliyet
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kar
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {financialData.testBased.map((test) => (
                  <tr key={test.testName}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {test.testName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      {test.revenue.toLocaleString('tr-TR')} TL
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      {test.cost.toLocaleString('tr-TR')} TL
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                      {test.profit.toLocaleString('tr-TR')} TL
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Finance; 