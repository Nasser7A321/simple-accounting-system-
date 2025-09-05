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

// Transactions Component
const Transactions = ({ user }) => {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  const [formData, setFormData] = useState({
    type: 'income',
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchTransactions();
    fetchCategories();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${API}/transactions`);
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const transactionData = {
        ...formData,
        amount: parseFloat(formData.amount),
        date: new Date(formData.date).toISOString()
      };

      if (editingTransaction) {
        await axios.put(`${API}/transactions/${editingTransaction.id}`, transactionData);
      } else {
        await axios.post(`${API}/transactions`, transactionData);
      }

      fetchTransactions();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      type: transaction.type,
      amount: transaction.amount.toString(),
      category: transaction.category,
      description: transaction.description,
      date: new Date(transaction.date).toISOString().split('T')[0]
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (transactionId) => {
    if (window.confirm('هل أنت متأكد من حذف هذه المعاملة؟')) {
      try {
        await axios.delete(`${API}/transactions/${transactionId}`);
        fetchTransactions();
      } catch (error) {
        console.error('Error deleting transaction:', error);
      }
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTransaction(null);
    setFormData({
      type: 'income',
      amount: '',
      category: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || transaction.type === filterType;
    const matchesCategory = filterCategory === 'all' || transaction.category === filterCategory;
    
    return matchesSearch && matchesType && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    );
  }

  const canManageTransactions = ['admin', 'accountant', 'financial_manager'].includes(user?.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">المعاملات المالية</h1>
        {canManageTransactions && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700">
                <Plus className="h-4 w-4 ml-2" />
                إضافة معاملة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-right">
                  {editingTransaction ? 'تعديل المعاملة المالية' : 'إضافة معاملة مالية جديدة'}
                </DialogTitle>
                <DialogDescription className="text-right">
                  املأ البيانات التالية لإنشاء معاملة مالية جديدة
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-right block">نوع المعاملة</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">إيراد</SelectItem>
                      <SelectItem value="expense">مصروف</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-right block">المبلغ (ر.س)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    className="text-right"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-right block">الفئة</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الفئة" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-right block">الوصف</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="text-right"
                    placeholder="وصف المعاملة المالية"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-right block">التاريخ</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600">
                    {editingTransaction ? 'تحديث المعاملة' : 'إضافة المعاملة'}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCloseDialog} className="flex-1">
                    إلغاء
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search and Filter Section */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-right block">البحث</Label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-right pr-10"
                  placeholder="البحث في الوصف أو الفئة..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-right block">نوع المعاملة</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنواع</SelectItem>
                  <SelectItem value="income">الإيرادات</SelectItem>
                  <SelectItem value="expense">المصروفات</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-right block">الفئة</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الفئات</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('all');
                  setFilterCategory('all');
                }}
                variant="outline"
                className="w-full"
              >
                مسح الفلاتر
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-0">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">لا توجد معاملات مالية</h3>
              <p className="text-gray-500">
                {canManageTransactions ? 'ابدأ بإضافة معاملة مالية جديدة' : 'لم يتم إنشاء أي معاملات مالية بعد'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-right p-4 font-semibold text-gray-700">النوع</th>
                    <th className="text-right p-4 font-semibold text-gray-700">المبلغ</th>
                    <th className="text-right p-4 font-semibold text-gray-700">الفئة</th>
                    <th className="text-right p-4 font-semibold text-gray-700">الوصف</th>
                    <th className="text-right p-4 font-semibold text-gray-700">التاريخ</th>
                    {canManageTransactions && (
                      <th className="text-center p-4 font-semibold text-gray-700">الإجراءات</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction, index) => (
                    <tr key={transaction.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="p-4">
                        <Badge className={transaction.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {transaction.type === 'income' ? 'إيراد' : 'مصروف'}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <span className={`font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.amount.toLocaleString()} ر.س
                        </span>
                      </td>
                      <td className="p-4 text-gray-700">{transaction.category}</td>
                      <td className="p-4 text-gray-700">{transaction.description}</td>
                      <td className="p-4 text-gray-500">
                        {new Date(transaction.date).toLocaleDateString('ar-SA')}
                      </td>
                      {canManageTransactions && (
                        <td className="p-4">
                          <div className="flex gap-2 justify-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(transaction)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(transaction.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Users Management Component
const UsersManagement = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    role: 'viewer'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/auth/register`, formData);
      fetchUsers();
      handleCloseDialog();
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  const handleDelete = async (userId) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
      try {
        await axios.delete(`${API}/users/${userId}`);
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setFormData({
      username: '',
      email: '',
      password: '',
      full_name: '',
      role: 'viewer'
    });
  };

  const getRoleName = (role) => {
    const roleNames = {
      admin: 'مدير النظام',
      accountant: 'محاسب',
      viewer: 'مشاهد',
      data_analyst: 'محلل بيانات',
      financial_manager: 'مدير مالي',
      auditor: 'مراجع حسابات'
    };
    return roleNames[role] || role;
  };

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
        <h1 className="text-3xl font-bold text-gray-800">إدارة المستخدمين</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700">
              <Plus className="h-4 w-4 ml-2" />
              إضافة مستخدم جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-right">إضافة مستخدم جديد</DialogTitle>
              <DialogDescription className="text-right">
                املأ البيانات التالية لإنشاء مستخدم جديد
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-right block">اسم المستخدم</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="text-right"
                  placeholder="اسم المستخدم"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-right block">البريد الإلكتروني</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="text-right"
                  placeholder="البريد الإلكتروني"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-right block">كلمة المرور</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="text-right"
                  placeholder="كلمة المرور"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-right block">الاسم الكامل</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  className="text-right"
                  placeholder="الاسم الكامل"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-right block">الدور</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">مشاهد</SelectItem>
                    <SelectItem value="accountant">محاسب</SelectItem>
                    <SelectItem value="financial_manager">مدير مالي</SelectItem>
                    <SelectItem value="data_analyst">محلل بيانات</SelectItem>
                    <SelectItem value="auditor">مراجع حسابات</SelectItem>
                    <SelectItem value="admin">مدير النظام</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600">
                  إضافة المستخدم
                </Button>
                <Button type="button" variant="outline" onClick={handleCloseDialog} className="flex-1">
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-0 shadow-lg">
        <CardContent className="p-0">
          {users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">لا يوجد مستخدمون</h3>
              <p className="text-gray-500">ابدأ بإضافة مستخدم جديد للنظام</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-right p-4 font-semibold text-gray-700">الاسم الكامل</th>
                    <th className="text-right p-4 font-semibold text-gray-700">اسم المستخدم</th>
                    <th className="text-right p-4 font-semibold text-gray-700">البريد الإلكتروني</th>
                    <th className="text-right p-4 font-semibold text-gray-700">الدور</th>
                    <th className="text-right p-4 font-semibold text-gray-700">تاريخ التسجيل</th>
                    <th className="text-center p-4 font-semibold text-gray-700">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((userItem, index) => (
                    <tr key={userItem.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="p-4 font-medium text-gray-800">{userItem.full_name}</td>
                      <td className="p-4 text-gray-700">{userItem.username}</td>
                      <td className="p-4 text-gray-700">{userItem.email}</td>
                      <td className="p-4">
                        <Badge className={`badge-${userItem.role}`}>
                          {getRoleName(userItem.role)}
                        </Badge>
                      </td>
                      <td className="p-4 text-gray-500">
                        {new Date(userItem.created_at).toLocaleDateString('ar-SA')}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2 justify-center">
                          {userItem.id !== user.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(userItem.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Activity Logs Component (for Data Analysts)
const ActivityLogs = ({ user }) => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await axios.get(`${API}/logs`);
      setLogs(response.data);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">سجل العمليات</h1>

      <Card className="border-0 shadow-lg">
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">لا يوجد سجل للعمليات</h3>
              <p className="text-gray-500">لم يتم تسجيل أي عمليات بعد</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-right p-4 font-semibold text-gray-700">الإجراء</th>
                    <th className="text-right p-4 font-semibold text-gray-700">التفاصيل</th>
                    <th className="text-right p-4 font-semibold text-gray-700">التوقيت</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, index) => (
                    <tr key={log.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="p-4 font-medium text-gray-800">{log.action}</td>
                      <td className="p-4 text-gray-700">{log.details}</td>
                      <td className="p-4 text-gray-500">
                        {new Date(log.timestamp).toLocaleString('ar-SA')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Financial Reports Component
const FinancialReports = ({ user }) => {
  const [activeReport, setActiveReport] = useState('profit-loss');
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });
  const [cashFlowPeriod, setCashFlowPeriod] = useState('monthly');

  const fetchReport = async (reportType, params = {}) => {
    setIsLoading(true);
    try {
      let endpoint = '';
      let queryParams = new URLSearchParams();

      switch (reportType) {
        case 'profit-loss':
          endpoint = 'reports/profit-loss';
          if (params.start_date) queryParams.append('start_date', params.start_date);
          if (params.end_date) queryParams.append('end_date', params.end_date);
          break;
        case 'balance-sheet':
          endpoint = 'reports/balance-sheet';
          break;
        case 'cash-flow':
          endpoint = 'reports/cash-flow';
          if (params.period) queryParams.append('period', params.period);
          break;
        case 'trends':
          endpoint = 'reports/trends';
          break;
        default:
          return;
      }

      const url = `${API}/${endpoint}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await axios.get(url);
      setReportData(response.data);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const params = activeReport === 'profit-loss' ? dateRange : 
                  activeReport === 'cash-flow' ? { period: cashFlowPeriod } : {};
    fetchReport(activeReport, params);
  }, [activeReport, dateRange, cashFlowPeriod]);

  const formatCurrency = (amount) => {
    return `${amount?.toLocaleString() || 0} ر.س`;
  };

  const renderProfitLossReport = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <Label className="text-right block">تاريخ البداية</Label>
          <Input
            type="date"
            value={dateRange.start_date}
            onChange={(e) => setDateRange({...dateRange, start_date: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-right block">تاريخ النهاية</Label>
          <Input
            type="date"
            value={dateRange.end_date}
            onChange={(e) => setDateRange({...dateRange, end_date: e.target.value})}
          />
        </div>
      </div>

      {reportData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-green-600">إجمالي الإيرادات</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(reportData.total_income)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-red-600">إجمالي المصروفات</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold text-red-600">
                {formatCurrency(reportData.total_expenses)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className={reportData.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                صافي الربح
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className={`text-3xl font-bold ${reportData.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(reportData.net_profit)}
              </div>
              <div className="text-sm text-gray-500 mt-2">
                هامش الربح: {reportData.profit_margin?.toFixed(1) || 0}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {reportData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-right">الإيرادات حسب الفئة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(reportData.income_by_category || {}).map(([category, amount]) => (
                  <div key={category} className="flex justify-between items-center">
                    <span className="text-gray-700">{category}</span>
                    <span className="font-semibold text-green-600">{formatCurrency(amount)}</span>
                  </div>
                ))}
                {Object.keys(reportData.income_by_category || {}).length === 0 && (
                  <p className="text-gray-500 text-center">لا توجد إيرادات في هذه الفترة</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-right">المصروفات حسب الفئة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(reportData.expense_by_category || {}).map(([category, amount]) => (
                  <div key={category} className="flex justify-between items-center">
                    <span className="text-gray-700">{category}</span>
                    <span className="font-semibold text-red-600">{formatCurrency(amount)}</span>
                  </div>
                ))}
                {Object.keys(reportData.expense_by_category || {}).length === 0 && (
                  <p className="text-gray-500 text-center">لا توجد مصروفات في هذه الفترة</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );

  const renderBalanceSheetReport = () => (
    <div className="space-y-6">
      {reportData && (
        <>
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-gray-800">
              الميزانية العمومية - {new Date(reportData.date).toLocaleDateString('ar-SA')}
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-right text-green-600">الأصول</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(reportData.assets?.by_category || {}).map(([category, amount]) => (
                    <div key={category} className="flex justify-between items-center">
                      <span className="text-gray-700">{category}</span>
                      <span className="font-semibold">{formatCurrency(amount)}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between items-center font-bold text-lg">
                    <span>إجمالي الأصول</span>
                    <span className="text-green-600">{formatCurrency(reportData.assets?.total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-right text-red-600">الخصوم</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(reportData.liabilities?.by_category || {}).map(([category, amount]) => (
                    <div key={category} className="flex justify-between items-center">
                      <span className="text-gray-700">{category}</span>
                      <span className="font-semibold">{formatCurrency(amount)}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between items-center font-bold text-lg">
                    <span>إجمالي الخصوم</span>
                    <span className="text-red-600">{formatCurrency(reportData.liabilities?.total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-right text-blue-600">حقوق الملكية</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className={`text-4xl font-bold ${reportData.equity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(reportData.equity)}
              </div>
              <div className="text-sm text-gray-500 mt-2">
                التحقق من التوازن: {reportData.balance_check ? '✅ متوازن' : '❌ غير متوازن'}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );

  const renderCashFlowReport = () => (
    <div className="space-y-6">
      <div className="mb-6">
        <Label className="text-right block mb-2">فترة التقرير</Label>
        <Select value={cashFlowPeriod} onValueChange={setCashFlowPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">يومي</SelectItem>
            <SelectItem value="weekly">أسبوعي</SelectItem>
            <SelectItem value="monthly">شهري</SelectItem>
            <SelectItem value="yearly">سنوي</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {reportData && reportData.cash_flow && (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-right p-4 font-semibold text-gray-700">الفترة</th>
                    <th className="text-right p-4 font-semibold text-gray-700">الإيرادات</th>
                    <th className="text-right p-4 font-semibold text-gray-700">المصروفات</th>
                    <th className="text-right p-4 font-semibold text-gray-700">صافي التدفق</th>
                    <th className="text-right p-4 font-semibold text-gray-700">الرصيد التراكمي</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.cash_flow.map((period, index) => (
                    <tr key={period.period} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="p-4 font-medium">{period.period}</td>
                      <td className="p-4 text-green-600">{formatCurrency(period.income)}</td>
                      <td className="p-4 text-red-600">{formatCurrency(period.expenses)}</td>
                      <td className={`p-4 font-semibold ${period.net_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(period.net_flow)}
                      </td>
                      <td className={`p-4 font-semibold ${period.running_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(period.running_balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {reportData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center">
              <CardTitle>عدد الفترات</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {reportData.total_periods}
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center">
              <CardTitle>نوع التقرير</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-lg font-semibold text-gray-700">
                {reportData.period_type === 'daily' && 'يومي'}
                {reportData.period_type === 'weekly' && 'أسبوعي'}
                {reportData.period_type === 'monthly' && 'شهري'}
                {reportData.period_type === 'yearly' && 'سنوي'}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center">
              <CardTitle>الرصيد النهائي</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className={`text-2xl font-bold ${reportData.final_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(reportData.final_balance)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );

  const renderTrendsReport = () => (
    <div className="space-y-6">
      {reportData && (
        <>
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-gray-800">
              تحليل الاتجاهات المالية - {reportData.analysis_period}
            </h3>
          </div>

          {reportData.growth_rates && reportData.growth_rates.length > 0 && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-right">معدلات النمو الشهرية</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reportData.growth_rates.slice(-6).map((item) => (
                    <div key={item.month} className="flex justify-between items-center">
                      <span className="text-gray-700">{item.month}</span>
                      <div className="flex items-center gap-3">
                        <span className={`font-semibold ${item.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(item.net_profit)}
                        </span>
                        <Badge className={item.growth_rate >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {item.growth_rate >= 0 ? '+' : ''}{item.growth_rate?.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {reportData.monthly_data && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-right">البيانات الشهرية</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-right p-4 font-semibold text-gray-700">الشهر</th>
                        <th className="text-right p-4 font-semibold text-gray-700">الإيرادات</th>
                        <th className="text-right p-4 font-semibold text-gray-700">المصروفات</th>
                        <th className="text-right p-4 font-semibold text-gray-700">صافي الربح</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(reportData.monthly_data).slice(-6).map(([month, data], index) => {
                        const netProfit = data.income - data.expenses;
                        return (
                          <tr key={month} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="p-4 font-medium">{month}</td>
                            <td className="p-4 text-green-600">{formatCurrency(data.income)}</td>
                            <td className="p-4 text-red-600">{formatCurrency(data.expenses)}</td>
                            <td className={`p-4 font-semibold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(netProfit)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );

  const renderCurrentReport = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
        </div>
      );
    }

    switch (activeReport) {
      case 'profit-loss':
        return renderProfitLossReport();
      case 'balance-sheet':
        return renderBalanceSheetReport();
      case 'cash-flow':
        return renderCashFlowReport();
      case 'trends':
        return renderTrendsReport();
      default:
        return <div>اختر نوع التقرير</div>;
    }
  };

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

      <Tabs value={activeReport} onValueChange={setActiveReport} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profit-loss">الأرباح والخسائر</TabsTrigger>
          <TabsTrigger value="balance-sheet">الميزانية العمومية</TabsTrigger>
          <TabsTrigger value="cash-flow">التدفق النقدي</TabsTrigger>
          <TabsTrigger value="trends" disabled={!['admin', 'data_analyst', 'financial_manager'].includes(user?.role)}>
            تحليل الاتجاهات
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeReport} className="mt-6">
          {renderCurrentReport()}
        </TabsContent>
      </Tabs>
    </div>
  );
};
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
        return <Transactions user={user} />;
      case 'reports':
        return <FinancialReports user={user} />;
      case 'users':
        return <UsersManagement user={user} />;
      case 'logs':
        return <ActivityLogs user={user} />;
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