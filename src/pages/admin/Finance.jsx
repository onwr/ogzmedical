import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
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

const Finance = () => {
  const [financialData, setFinancialData] = useState({
    daily: [],
    monthly: [],
    testBased: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('month');
  const [selectedDealer, setSelectedDealer] = useState('all');
  const [dealers, setDealers] = useState([]);
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    profit: 0,
    debt: 0
  });

  useEffect(() => {
    fetchDealers();
    fetchFinancialData();
  }, [dateRange, selectedDealer]);

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

  const fetchFinancialData = async () => {
    try {
      setIsLoading(true);
      const startDate = new Date();
      if (dateRange === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (dateRange === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (dateRange === 'year') {
        startDate.setFullYear(startDate.getFullYear() - 1);
      }

      const q = query(
        collection(db, 'financials'),
        where('date', '>=', startDate),
        orderBy('date', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Process data for different views
      const processedData = processFinancialData(data);
      setFinancialData(processedData);
      calculateSummary(processedData);
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const processFinancialData = (data) => {
    // Group data by date for daily view
    const dailyData = data.reduce((acc, item) => {
      const date = item.date.toDate().toLocaleDateString();
      if (!acc[date]) {
        acc[date] = { income: 0, expense: 0 };
      }
      if (item.type === 'income') {
        acc[date].income += item.amount;
      } else {
        acc[date].expense += item.amount;
      }
      return acc;
    }, {});

    // Group data by month for monthly view
    const monthlyData = data.reduce((acc, item) => {
      const month = item.date.toDate().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
      if (!acc[month]) {
        acc[month] = { income: 0, expense: 0 };
      }
      if (item.type === 'income') {
        acc[month].income += item.amount;
      } else {
        acc[month].expense += item.amount;
      }
      return acc;
    }, {});

    // Group data by test for test-based view
    const testData = data.reduce((acc, item) => {
      if (item.testId) {
        if (!acc[item.testId]) {
          acc[item.testId] = { income: 0, expense: 0, name: item.testName };
        }
        if (item.type === 'income') {
          acc[item.testId].income += item.amount;
        } else {
          acc[item.testId].expense += item.amount;
        }
      }
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
      testBased: Object.entries(testData).map(([testId, values]) => ({
        testId,
        ...values
      }))
    };
  };

  const calculateSummary = (data) => {
    const summary = {
      totalIncome: 0,
      totalExpense: 0,
      profit: 0,
      debt: 0
    };

    data.daily.forEach(day => {
      summary.totalIncome += day.income;
      summary.totalExpense += day.expense;
    });

    summary.profit = summary.totalIncome - summary.totalExpense;
    summary.debt = summary.totalExpense - summary.totalIncome;

    setSummary(summary);
  };

  const chartData = {
    daily: {
      labels: financialData.daily.map(item => item.date),
      datasets: [
        {
          label: 'Gelir',
          data: financialData.daily.map(item => item.income),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.5)',
        },
        {
          label: 'Gider',
          data: financialData.daily.map(item => item.expense),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.5)',
        },
      ],
    },
    monthly: {
      labels: financialData.monthly.map(item => item.month),
      datasets: [
        {
          label: 'Gelir',
          data: financialData.monthly.map(item => item.income),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.5)',
        },
        {
          label: 'Gider',
          data: financialData.monthly.map(item => item.expense),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.5)',
        },
      ],
    },
    testBased: {
      labels: financialData.testBased.map(item => item.name),
      datasets: [
        {
          label: 'Gelir',
          data: financialData.testBased.map(item => item.income),
          backgroundColor: 'rgba(34, 197, 94, 0.5)',
        },
        {
          label: 'Gider',
          data: financialData.testBased.map(item => item.expense),
          backgroundColor: 'rgba(239, 68, 68, 0.5)',
        },
      ],
    },
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
          <h1 className="text-2xl font-semibold text-gray-900">Finans Raporları</h1>
          <div className="flex space-x-4">
            <select
              className="rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="week">Son 7 Gün</option>
              <option value="month">Son 30 Gün</option>
              <option value="year">Son 1 Yıl</option>
            </select>
            <select
              className="rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={selectedDealer}
              onChange={(e) => setSelectedDealer(e.target.value)}
            >
              <option value="all">Tüm Bayiler</option>
              {dealers.map(dealer => (
                <option key={dealer.id} value={dealer.id}>
                  {dealer.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Toplam Gelir</h3>
            <p className="mt-2 text-3xl font-semibold text-green-600">
              {summary.totalIncome.toLocaleString('tr-TR')} TL
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Toplam Gider</h3>
            <p className="mt-2 text-3xl font-semibold text-red-600">
              {summary.totalExpense.toLocaleString('tr-TR')} TL
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Kâr</h3>
            <p className="mt-2 text-3xl font-semibold text-blue-600">
              {summary.profit.toLocaleString('tr-TR')} TL
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Borç</h3>
            <p className="mt-2 text-3xl font-semibold text-orange-600">
              {summary.debt.toLocaleString('tr-TR')} TL
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Günlük Gelir/Gider</h3>
            <Line data={chartData.daily} />
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Aylık Gelir/Gider</h3>
            <Line data={chartData.monthly} />
          </div>
          <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Test Bazlı Gelir/Gider</h3>
            <Bar data={chartData.testBased} />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Finance; 