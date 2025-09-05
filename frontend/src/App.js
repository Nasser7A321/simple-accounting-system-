import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// Icons
import { 
  Menu, X, Home, Users, DollarSign, BarChart3, Settings, 
  LogOut, Plus, Eye, Edit, Trash2, Activity, FileText,
  TrendingUp, TrendingDown, Calendar, Search, Filter,
  Save, Download, Upload, Bell, Lock, User, Globe,
  Database, Shield, Mail, Phone, MapPin, Building
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
import { Switch } from './components/ui/switch';

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
      <Card className="w-full max-w-md shadow-2xl border-0 backdrop-blur-sm bg-white/95">
        <CardHeader className="text-center pb-6">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-lg">
            <DollarSign className="h-10 w-10 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-800 mb-2">نظام المحاسبة المتكامل</CardTitle>
          <CardDescription className="text-gray-600">قم بتسجيل الدخول للوصول إلى حسابك</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-right block font-medium">اسم المستخدم</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="text-right h-12 rounded-lg border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                placeholder="أدخل اسم المستخدم"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-right block font-medium">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="text-right h-12 rounded-lg border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                placeholder="أدخل كلمة المرور"
                required
              />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm text-right">
                {error}
              </div>
            )}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium h-12 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
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
    <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-white">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <div className={`p-2 rounded-lg bg-gradient-to-br ${color.bg}`}>
          <Icon className={`h-5 w-5 ${color.text}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${color.text} mb-1`}>
          {format === 'currency' ? `${value.toLocaleString()} ر.س` : value.toLocaleString()}
        </div>
        <p className="text-xs text-gray-500">مقارنة بالشهر الماضي</p>
      </CardContent>
      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${color.bg}`} />
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
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">لوحة التحكم الرئيسية</h1>
          <p className="text-gray-600">مرحباً بك، {user?.full_name}</p>
        </div>
        <Badge variant="secondary" className="px-4 py-2 text-sm font-medium">
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
          color={{ text: "text-green-600", bg: "from-green-100 to-green-200" }}
          format="currency"
        />
        <StatCard
          title="إجمالي المصروفات"
          value={stats.total_expenses}
          icon={TrendingDown}
          color={{ text: "text-red-600", bg: "from-red-100 to-red-200" }}
          format="currency"
        />
        <StatCard
          title="صافي الربح"
          value={stats.net_profit}
          icon={DollarSign}
          color={stats.net_profit >= 0 ? 
            { text: "text-green-600", bg: "from-green-100 to-green-200" } : 
            { text: "text-red-600", bg: "from-red-100 to-red-200" }
          }
          format="currency"
        />
        <StatCard
          title="عدد المستخدمين"
          value={stats.total_users}
          icon={Users}
          color={{ text: "text-blue-600", bg: "from-blue-100 to-blue-200" }}
        />
        <StatCard
          title="عدد المعاملات"
          value={stats.total_transactions}
          icon={FileText}
          color={{ text: "text-purple-600", bg: "from-purple-100 to-purple-200" }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg bg-white">
          <CardHeader>
            <CardTitle className="text-right flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              الملخص المالي
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">نسبة الربحية</div>
                <div className={`font-semibold ${stats.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.total_income > 0 ? ((stats.net_profit / stats.total_income) * 100).toFixed(1) : 0}%
                </div>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">متوسط المعاملة</div>
                <div className="font-semibold text-gray-800">
                  {stats.total_transactions > 0 
                    ? Math.round((stats.total_income + stats.total_expenses) / stats.total_transactions).toLocaleString() 
                    : 0} ر.س
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white">
          <CardHeader>
            <CardTitle className="text-right flex items-center gap-2">
              <Activity className="h-5 w-5" />
              الأنشطة الحديثة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-gray-500 py-8">
              <Activity className="h-16 w-16 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium mb-1">لا توجد أنشطة حديثة</p>
              <p className="text-sm">ستظهر هنا آخر العمليات المالية</p>
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

  const canManageTransactions = ['admin', 'accountant', 'financial_manager'].includes(user?.role);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">المعاملات المالية</h1>
          <p className="text-gray-600">إدارة جميع المعاملات المالية للنظام</p>
        </div>
        {canManageTransactions && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg">
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
      <Card className="border-0 shadow-lg bg-white">
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
      <Card className="border-0 shadow-lg bg-white">
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
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(transaction.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full"
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

  const getRoleColor = (role) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      accountant: 'bg-green-100 text-green-800',
      viewer: 'bg-blue-100 text-blue-800',
      data_analyst: 'bg-purple-100 text-purple-800',
      financial_manager: 'bg-orange-100 text-orange-800',
      auditor: 'bg-cyan-100 text-cyan-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">إدارة المستخدمين</h1>
          <p className="text-gray-600">إدارة مستخدمي النظام والصلاحيات</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg">
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

      <Card className="border-0 shadow-lg bg-white">
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
                        <Badge className={getRoleColor(userItem.role)}>
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
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full"
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">التقارير المالية</h1>
          <p className="text-gray-600">تقارير مالية شاملة ومفصلة</p>
        </div>
        <Badge variant="secondary" className="px-4 py-2 text-sm font-medium">
          {user?.role === 'admin' && 'مدير النظام'}
          {user?.role === 'accountant' && 'محاسب'}
          {user?.role === 'viewer' && 'مشاهد'}
          {user?.role === 'data_analyst' && 'محلل بيانات'}
          {user?.role === 'financial_manager' && 'مدير مالي'}
          {user?.role === 'auditor' && 'مراجع حسابات'}
        </Badge>
      </div>

      <Tabs value={activeReport} onValueChange={setActiveReport} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-1 rounded-lg">
          <TabsTrigger 
            value="profit-loss" 
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
          >
            الأرباح والخسائر
          </TabsTrigger>
          <TabsTrigger 
            value="balance-sheet"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
          >
            الميزانية العمومية
          </TabsTrigger>
          <TabsTrigger 
            value="cash-flow"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
          >
            التدفق النقدي
          </TabsTrigger>
          <TabsTrigger 
            value="trends" 
            disabled={!['admin', 'data_analyst', 'financial_manager'].includes(user?.role)}
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md disabled:opacity-50"
          >
            تحليل الاتجاهات
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeReport} className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
            </div>
          ) : (
            <Card className="border-0 shadow-lg bg-white">
              <CardContent className="p-6">
                <div className="text-center py-12">
                  <BarChart3 className="h-16 w-16 mx-auto text-emerald-500 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    {activeReport === 'profit-loss' && 'تقرير الأرباح والخسائر جاهز'}
                    {activeReport === 'balance-sheet' && 'الميزانية العمومية جاهزة'}
                    {activeReport === 'cash-flow' && 'تقرير التدفق النقدي جاهز'}
                    {activeReport === 'trends' && 'تحليل الاتجاهات المالية جاهز'}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {reportData ? 'تم تحميل البيانات بنجاح' : 'لا توجد بيانات للعرض'}
                  </p>
                  {reportData && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 inline-block">
                      <p className="text-emerald-700 text-sm">
                        آخر تحديث: {new Date().toLocaleString('ar-SA')}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Activity Logs Component  
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">سجل العمليات</h1>
          <p className="text-gray-600">مراقبة جميع الأنشطة والعمليات في النظام</p>
        </div>
        <Badge variant="secondary" className="px-4 py-2 text-sm font-medium">
          محلل بيانات
        </Badge>
      </div>

      <Card className="border-0 shadow-lg bg-white">
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
                      <td className="p-4">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {log.action}
                        </Badge>
                      </td>
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

// Settings Component
const AppSettings = ({ user }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState({
    email: user?.email || '',
    full_name: user?.full_name || ''
  });
  const [systemSettings, setSystemSettings] = useState({
    system_name: 'نظام المحاسبة المتكامل',
    timezone: 'Asia/Riyadh',
    currency: 'ر.س',
    backup_enabled: true,
    notification_enabled: true
  });

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/settings/profile`, profileData);
      alert('تم تحديث الملف الشخصي بنجاح');
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleSystemUpdate = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/settings/system`, systemSettings);
      alert('تم تحديث إعدادات النظام بنجاح');
    } catch (error) {
      console.error('Error updating system settings:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">الإعدادات</h1>
          <p className="text-gray-600">إدارة إعدادات الحساب والنظام</p>
        </div>
        <Badge variant="secondary" className="px-4 py-2 text-sm font-medium">
          {user?.role === 'admin' && 'مدير النظام'}
          {user?.role === 'accountant' && 'محاسب'}
          {user?.role === 'viewer' && 'مشاهد'}
          {user?.role === 'data_analyst' && 'محلل بيانات'}
          {user?.role === 'financial_manager' && 'مدير مالي'}
          {user?.role === 'auditor' && 'مراجع حسابات'}
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 rounded-lg">
          <TabsTrigger 
            value="profile"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
          >
            <User className="h-4 w-4 ml-2" />
            الملف الشخصي
          </TabsTrigger>
          <TabsTrigger 
            value="notifications"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
          >
            <Bell className="h-4 w-4 ml-2" />
            الإشعارات
          </TabsTrigger>
          {user?.role === 'admin' && (
            <TabsTrigger 
              value="system"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
            >
              <Settings className="h-4 w-4 ml-2" />
              إعدادات النظام
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader>
              <CardTitle className="text-right flex items-center gap-2">
                <User className="h-5 w-5" />
                إعدادات الملف الشخصي
              </CardTitle>
              <CardDescription className="text-right">
                قم بتحديث معلومات حسابك الشخصي
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-right block">اسم المستخدم</Label>
                    <Input 
                      value={user?.username || ''} 
                      disabled 
                      className="text-right bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 text-right">لا يمكن تغيير اسم المستخدم</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-right block">الدور</Label>
                    <Input 
                      value={user?.role === 'admin' ? 'مدير النظام' : 
                             user?.role === 'accountant' ? 'محاسب' :
                             user?.role === 'viewer' ? 'مشاهد' :
                             user?.role === 'data_analyst' ? 'محلل بيانات' :
                             user?.role === 'financial_manager' ? 'مدير مالي' :
                             user?.role === 'auditor' ? 'مراجع حسابات' : user?.role} 
                      disabled 
                      className="text-right bg-gray-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-right block">البريد الإلكتروني</Label>
                    <Input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                      className="text-right"
                      placeholder="البريد الإلكتروني"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-right block">الاسم الكامل</Label>
                    <Input
                      value={profileData.full_name}
                      onChange={(e) => setProfileData({...profileData, full_name: e.target.value})}
                      className="text-right"
                      placeholder="الاسم الكامل"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit" className="bg-gradient-to-r from-emerald-500 to-teal-600">
                    <Save className="h-4 w-4 ml-2" />
                    حفظ التغييرات
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader>
              <CardTitle className="text-right flex items-center gap-2">
                <Bell className="h-5 w-5" />
                إعدادات الإشعارات
              </CardTitle>
              <CardDescription className="text-right">
                تحكم في إشعارات النظام التي تريد استلامها
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="text-right">
                  <h4 className="font-medium">إشعارات البريد الإلكتروني</h4>
                  <p className="text-sm text-gray-500">تلقي إشعارات العمليات المالية عبر البريد</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="text-right">
                  <h4 className="font-medium">تنبيهات النظام</h4>
                  <p className="text-sm text-gray-500">تنبيهات داخل النظام للعمليات المهمة</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="text-right">
                  <h4 className="font-medium">تقارير دورية</h4>
                  <p className="text-sm text-gray-500">إرسال تقارير مالية دورية</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {user?.role === 'admin' && (
          <TabsContent value="system" className="mt-6">
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader>
                <CardTitle className="text-right flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  إعدادات النظام
                </CardTitle>
                <CardDescription className="text-right">
                  إدارة الإعدادات العامة للنظام
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSystemUpdate} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-right block">اسم النظام</Label>
                      <Input
                        value={systemSettings.system_name}
                        onChange={(e) => setSystemSettings({...systemSettings, system_name: e.target.value})}
                        className="text-right"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-right block">المنطقة الزمنية</Label>
                      <Select value={systemSettings.timezone} onValueChange={(value) => setSystemSettings({...systemSettings, timezone: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Asia/Riyadh">الرياض (GMT+3)</SelectItem>
                          <SelectItem value="Asia/Dubai">دبي (GMT+4)</SelectItem>
                          <SelectItem value="Africa/Cairo">القاهرة (GMT+2)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-right block">العملة</Label>
                      <Select value={systemSettings.currency} onValueChange={(value) => setSystemSettings({...systemSettings, currency: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ر.س">ريال سعودي (ر.س)</SelectItem>
                          <SelectItem value="د.إ">درهم إماراتي (د.إ)</SelectItem>
                          <SelectItem value="ج.م">جنيه مصري (ج.م)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="text-right">
                        <h4 className="font-medium">النسخ الاحتياطي التلقائي</h4>
                        <p className="text-sm text-gray-500">إنشاء نسخ احتياطية تلقائية يومية</p>
                      </div>
                      <Switch 
                        checked={systemSettings.backup_enabled}
                        onCheckedChange={(checked) => setSystemSettings({...systemSettings, backup_enabled: checked})}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="text-right">
                        <h4 className="font-medium">الإشعارات العامة</h4>
                        <p className="text-sm text-gray-500">تفعيل نظام الإشعارات للمستخدمين</p>
                      </div>
                      <Switch 
                        checked={systemSettings.notification_enabled}
                        onCheckedChange={(checked) => setSystemSettings({...systemSettings, notification_enabled: checked})}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="submit" className="bg-gradient-to-r from-emerald-500 to-teal-600">
                      <Save className="h-4 w-4 ml-2" />
                      حفظ الإعدادات
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
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
    { icon: Settings, label: 'الإعدادات', id: 'settings', roles: ['admin', 'accountant', 'viewer', 'data_analyst', 'financial_manager', 'auditor'] },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.role)
  );

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={onClose} />
      )}
      <div className={`fixed right-0 top-0 h-full w-80 bg-white shadow-2xl transform ${isOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300 ease-in-out z-50 lg:relative lg:translate-x-0 border-l border-gray-100`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-emerald-500 to-teal-600">
          <h2 className="text-xl font-bold text-white">القائمة الرئيسية</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="lg:hidden text-white hover:bg-white/20">
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* User Info */}
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
              {user?.full_name?.charAt(0) || user?.username?.charAt(0)}
            </div>
            <div className="text-right flex-1">
              <p className="font-semibold text-gray-800 text-lg">{user?.full_name}</p>
              <p className="text-sm text-emerald-600 font-medium">
                {user?.role === 'admin' && 'مدير النظام'}
                {user?.role === 'accountant' && 'محاسب'}
                {user?.role === 'viewer' && 'مشاهد'}  
                {user?.role === 'data_analyst' && 'محلل بيانات'}
                {user?.role === 'financial_manager' && 'مدير مالي'}
                {user?.role === 'auditor' && 'مراجع حسابات'}
              </p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {filteredMenuItems.map((item) => (
              <li key={item.id}>
                <button
                  className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-3 text-gray-700 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-all duration-200 text-right group ${
                    currentPage === item.id ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg' : ''
                  }`}
                  onClick={() => {
                    onPageChange(item.id);
                    onClose();
                  }}
                >
                  <item.icon className={`h-5 w-5 ${currentPage === item.id ? 'text-white' : 'text-gray-500 group-hover:text-emerald-600'}`} />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <Button
            onClick={logout}
            variant="outline"
            className="w-full justify-center text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 transition-colors duration-200 rounded-xl"
          >
            <LogOut className="h-5 w-5 ml-2" />
            تسجيل الخروج
          </Button>
        </div>
      </div>
    </>
  );
};

// Main App Component
const AppContent = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-500 mx-auto mb-4" />
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
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
      case 'settings':
        return <AppSettings user={user} />;
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
        <header className="bg-white shadow-sm border-b border-gray-100 px-4 py-3 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 space-x-reverse">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden hover:bg-gray-100 rounded-full"
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
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium text-gray-700">{user.full_name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                {user.full_name?.charAt(0) || user.username?.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
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