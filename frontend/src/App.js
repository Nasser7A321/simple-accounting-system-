import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// Icons
import { 
  Menu, X, Home, Users, DollarSign, BarChart3, Settings, 
  LogOut, Plus, Eye, Edit, Trash2, Activity, FileText,
  TrendingUp, TrendingDown, Calendar, Search, Filter
} from 'lucide-react';

// Components
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Label } from './components/ui/label';
import { Textarea } from './components/ui/textarea';
import { Badge } from './components/ui/badge';
import { Separator } from './components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchCurrentUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { username, password });
      const { access_token, user_info } = response.data;
      
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      setUser(user_info);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'فشل في تسجيل الدخول' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Login Component
const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const result = await login(username, password);
    if (!result.success) {
      setError(result.error);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
            <DollarSign className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800">نظام المحاسبة المتكامل</CardTitle>
          <CardDescription className="text-gray-600 mt-2">قم بتسجيل الدخول للوصول إلى حسابك</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-right block">اسم المستخدم</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="text-right"
                placeholder="أدخل اسم المستخدم"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-right block">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="text-right"
                placeholder="أدخل كلمة المرور"
                required
              />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm text-right">
                {error}
              </div>
            )}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium py-2 px-4 rounded-md transition-all duration-200"
              disabled={isLoading}
            >
              {isLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

// Dashboard Component
const Dashboard = ({ user }) => {
  const [stats, setStats] = useState({
    total_income: 0,
    total_expenses: 0,
    net_profit: 0,
    total_users: 0,
    total_transactions: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, format = 'number' }) => (
    <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${color}`}>
          {format === 'currency' ? `${value.toLocaleString()} ر.س` : value.toLocaleString()}
        </div>
      </CardContent>
      <div className={`absolute bottom-0 left-0 right-0 h-1 ${color.replace('text-', 'bg-')}`} />
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">لوحة التحكم الرئيسية</h1>
        <Badge variant="secondary" className="px-3 py-1">
          {user?.role === 'admin' && 'مدير النظام'}
          {user?.role === 'accountant' && 'محاسب'}
          {user?.role === 'viewer' && 'مشاهد'}
          {user?.role === 'data_analyst' && 'محلل بيانات'}
          {user?.role === 'financial_manager' && 'مدير مالي'}
          {user?.role === 'auditor' && 'مراجع حسابات'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard
          title="إجمالي الإيرادات"
          value={stats.total_income}
          icon={TrendingUp}
          color="text-green-600"
          format="currency"
        />
        <StatCard
          title="إجمالي المصروفات"
          value={stats.total_expenses}
          icon={TrendingDown}
          color="text-red-600"
          format="currency"
        />
        <StatCard
          title="صافي الربح"
          value={stats.net_profit}
          icon={DollarSign}
          color={stats.net_profit >= 0 ? "text-green-600" : "text-red-600"}
          format="currency"
        />
        <StatCard
          title="عدد المستخدمين"
          value={stats.total_users}
          icon={Users}
          color="text-blue-600"
        />
        <StatCard
          title="عدد المعاملات"
          value={stats.total_transactions}
          icon={FileText}
          color="text-purple-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-right">الملخص المالي</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">نسبة الربحية</div>
                <div className={`font-semibold ${stats.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.total_income > 0 ? ((stats.net_profit / stats.total_income) * 100).toFixed(1) : 0}%
                </div>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">متوسط المعاملة</div>
                <div className="font-semibold">
                  {stats.total_transactions > 0 
                    ? Math.round((stats.total_income + stats.total_expenses) / stats.total_transactions).toLocaleString() 
                    : 0} ر.س
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-right">الأنشطة الحديثة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-gray-500 py-8">
              <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>لا توجد أنشطة حديثة</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Sidebar Component
const Sidebar = ({ isOpen, onClose, user, currentPage, onPageChange }) => {
  const { logout } = useAuth();
  
  const menuItems = [
    { icon: Home, label: 'الرئيسية', id: 'dashboard', roles: ['admin', 'accountant', 'viewer', 'data_analyst', 'financial_manager', 'auditor'] },
    { icon: DollarSign, label: 'المعاملات المالية', id: 'transactions', roles: ['admin', 'accountant', 'financial_manager', 'viewer'] },
    { icon: BarChart3, label: 'التقارير المالية', id: 'reports', roles: ['admin', 'accountant', 'viewer', 'financial_manager', 'auditor'] },
    { icon: Users, label: 'إدارة المستخدمين', id: 'users', roles: ['admin'] },
    { icon: Activity, label: 'سجل العمليات', id: 'logs', roles: ['admin', 'data_analyst'] },
    { icon: Settings, label: 'الإعدادات', id: 'settings', roles: ['admin'] },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.role)
  );

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={onClose} />
      )}
      <div className={`fixed right-0 top-0 h-full w-80 bg-white shadow-2xl transform ${isOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300 ease-in-out z-50 lg:relative lg:translate-x-0`}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">القائمة الرئيسية</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="lg:hidden">
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold">
              {user?.full_name?.charAt(0) || user?.username?.charAt(0)}
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-800">{user?.full_name}</p>
              <p className="text-sm text-gray-500">
                {user?.role === 'admin' && 'مدير النظام'}
                {user?.role === 'accountant' && 'محاسب'}
                {user?.role === 'viewer' && 'مشاهد'}  
                {user?.role === 'data_analyst' && 'محلل بيانات'}
                {user?.role === 'financial_manager' && 'مدير مالي'}
                {user?.role === 'auditor' && 'مراجع حسابات'}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {filteredMenuItems.map((item) => (
              <li key={item.id}>
                <button
                  className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-50 hover:text-emerald-600 transition-colors duration-200 text-right ${
                    currentPage === item.id ? 'bg-emerald-50 text-emerald-600 border-r-4 border-emerald-500' : ''
                  }`}
                  onClick={() => {
                    onPageChange(item.id);
                    onClose();
                  }}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <Button
            onClick={logout}
            variant="outline"
            className="w-full justify-center text-red-600 border-red-200 hover:bg-red-50"
          >
            <LogOut className="h-5 w-5 ml-2" />
            تسجيل الخروج
          </Button>
        </div>
      </div>
    </>
  );
};

// Financial Reports Component
const FinancialReports = ({ user }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">التقارير المالية</h1>
        <Badge variant="secondary" className="px-3 py-1">
          {user?.role === 'admin' && 'مدير النظام'}
          {user?.role === 'accountant' && 'محاسب'}
          {user?.role === 'viewer' && 'مشاهد'}
          {user?.role === 'data_analyst' && 'محلل بيانات'}
          {user?.role === 'financial_manager' && 'مدير مالي'}
          {user?.role === 'auditor' && 'مراجع حسابات'}
        </Badge>
      </div>

      <Tabs defaultValue="profit-loss" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profit-loss">الأرباح والخسائر</TabsTrigger>
          <TabsTrigger value="balance-sheet">الميزانية العمومية</TabsTrigger>
          <TabsTrigger value="cash-flow">التدفق النقدي</TabsTrigger>
          <TabsTrigger value="trends" disabled={!['admin', 'data_analyst', 'financial_manager'].includes(user?.role)}>
            تحليل الاتجاهات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profit-loss" className="mt-6">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="text-center py-12">
                <BarChart3 className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">تقرير الأرباح والخسائر</h3>
                <p className="text-gray-500">سيتم عرض التقرير هنا</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balance-sheet" className="mt-6">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="text-center py-12">
                <BarChart3 className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">الميزانية العمومية</h3>
                <p className="text-gray-500">سيتم عرض التقرير هنا</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cash-flow" className="mt-6">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="text-center py-12">
                <BarChart3 className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">التدفق النقدي</h3>
                <p className="text-gray-500">سيتم عرض التقرير هنا</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="mt-6">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="text-center py-12">
                <BarChart3 className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">تحليل الاتجاهات المالية</h3>
                <p className="text-gray-500">سيتم عرض التقرير هنا</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Simple placeholder components
const Transactions = () => (
  <div className="text-center py-12">
    <DollarSign className="h-16 w-16 mx-auto text-gray-300 mb-4" />
    <h1 className="text-3xl font-bold text-gray-800 mb-2">المعاملات المالية</h1>
    <p className="text-gray-500">سيتم تطوير هذه الصفحة قريباً</p>
  </div>
);

const UsersManagement = () => (
  <div className="text-center py-12">
    <Users className="h-16 w-16 mx-auto text-gray-300 mb-4" />
    <h1 className="text-3xl font-bold text-gray-800 mb-2">إدارة المستخدمين</h1>
    <p className="text-gray-500">سيتم تطوير هذه الصفحة قريباً</p>
  </div>
);

const ActivityLogs = () => (
  <div className="text-center py-12">
    <Activity className="h-16 w-16 mx-auto text-gray-300 mb-4" />
    <h1 className="text-3xl font-bold text-gray-800 mb-2">سجل العمليات</h1>
    <p className="text-gray-500">سيتم تطوير هذه الصفحة قريباً</p>
  </div>
);

// Main App Component
const AppContent = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard user={user} />;
      case 'transactions':
        return <Transactions />;
      case 'reports':
        return <FinancialReports user={user} />;
      case 'users':
        return <UsersManagement />;
      case 'logs':
        return <ActivityLogs />;
      default:
        return <Dashboard user={user} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
      
      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm border-b border-gray-100 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 space-x-reverse">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-gray-800">نظام المحاسبة المتكامل</h1>
                <p className="text-sm text-gray-500">
                  أهلاً وسهلاً، {user.full_name}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700">{user.full_name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold">
                {user.full_name?.charAt(0) || user.username?.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6">
          {renderCurrentPage()}
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/*" element={<AppContent />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;