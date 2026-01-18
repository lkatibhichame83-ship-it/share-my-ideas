import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Users, 
  FileText, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  UserCheck,
  UserX,
  Clock,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface Stats {
  totalUsers: number;
  totalWorkers: number;
  totalClients: number;
  verifiedWorkers: number;
  pendingWorkers: number;
  totalRequests: number;
  pendingRequests: number;
  completedRequests: number;
  cancelledRequests: number;
  totalRevenue: number;
  pendingPayments: number;
  completedPayments: number;
  userGrowth: number;
  requestGrowth: number;
  revenueGrowth: number;
}

interface MonthlyData {
  month: string;
  users: number;
  requests: number;
  revenue: number;
}

const AdminStats = () => {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && isAdmin) {
      fetchStats();
      fetchMonthlyData();
    }
  }, [user, isAdmin]);

  const fetchStats = async () => {
    try {
      // Fetch users stats
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: totalWorkers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('account_type', 'worker');

      const { count: totalClients } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('account_type', 'client');

      const { count: verifiedWorkers } = await supabase
        .from('worker_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_verified', true);

      const { count: pendingWorkers } = await supabase
        .from('worker_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_verified', false);

      // Fetch requests stats
      const { count: totalRequests } = await supabase
        .from('service_requests')
        .select('*', { count: 'exact', head: true });

      const { count: pendingRequests } = await supabase
        .from('service_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: completedRequests } = await supabase
        .from('service_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      const { count: cancelledRequests } = await supabase
        .from('service_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'cancelled');

      // Fetch payments stats
      const { data: payments } = await supabase
        .from('payments')
        .select('amount, status');

      const totalRevenue = payments?.reduce((sum, p) => 
        p.status === 'completed' ? sum + Number(p.amount) : sum, 0) || 0;

      const pendingPayments = payments?.filter(p => p.status === 'pending').length || 0;
      const completedPayments = payments?.filter(p => p.status === 'completed').length || 0;

      // Calculate growth (comparing last 30 days to previous 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const { count: recentUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());

      const { count: previousUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sixtyDaysAgo.toISOString())
        .lt('created_at', thirtyDaysAgo.toISOString());

      const { count: recentRequests } = await supabase
        .from('service_requests')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());

      const { count: previousRequests } = await supabase
        .from('service_requests')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sixtyDaysAgo.toISOString())
        .lt('created_at', thirtyDaysAgo.toISOString());

      const userGrowth = previousUsers ? ((recentUsers || 0) - previousUsers) / previousUsers * 100 : 0;
      const requestGrowth = previousRequests ? ((recentRequests || 0) - previousRequests) / previousRequests * 100 : 0;

      setStats({
        totalUsers: totalUsers || 0,
        totalWorkers: totalWorkers || 0,
        totalClients: totalClients || 0,
        verifiedWorkers: verifiedWorkers || 0,
        pendingWorkers: pendingWorkers || 0,
        totalRequests: totalRequests || 0,
        pendingRequests: pendingRequests || 0,
        completedRequests: completedRequests || 0,
        cancelledRequests: cancelledRequests || 0,
        totalRevenue,
        pendingPayments,
        completedPayments,
        userGrowth: Math.round(userGrowth),
        requestGrowth: Math.round(requestGrowth),
        revenueGrowth: 0, // Would need payment history for accurate calculation
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyData = async () => {
    try {
      const months: MonthlyData[] = [];
      const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 
                         'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const { count: users } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startOfMonth.toISOString())
          .lte('created_at', endOfMonth.toISOString());

        const { count: requests } = await supabase
          .from('service_requests')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startOfMonth.toISOString())
          .lte('created_at', endOfMonth.toISOString());

        const { data: payments } = await supabase
          .from('payments')
          .select('amount')
          .eq('status', 'completed')
          .gte('created_at', startOfMonth.toISOString())
          .lte('created_at', endOfMonth.toISOString());

        const revenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

        months.push({
          month: monthNames[date.getMonth()],
          users: users || 0,
          requests: requests || 0,
          revenue,
        });
      }

      setMonthlyData(months);
    } catch (error) {
      console.error('Error fetching monthly data:', error);
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">غير مصرح</h2>
          <p className="text-muted-foreground mb-4">ليس لديك صلاحية للوصول إلى هذه الصفحة</p>
          <Button onClick={() => navigate('/')}>العودة للرئيسية</Button>
        </Card>
      </div>
    );
  }

  const userTypeData = [
    { name: 'عملاء', value: stats?.totalClients || 0, color: 'hsl(var(--primary))' },
    { name: 'عمال', value: stats?.totalWorkers || 0, color: 'hsl(var(--secondary))' },
  ];

  const requestStatusData = [
    { name: 'معلقة', value: stats?.pendingRequests || 0, color: 'hsl(45, 93%, 47%)' },
    { name: 'مكتملة', value: stats?.completedRequests || 0, color: 'hsl(142, 76%, 36%)' },
    { name: 'ملغية', value: stats?.cancelledRequests || 0, color: 'hsl(0, 84%, 60%)' },
  ];

  const chartConfig = {
    users: { label: 'المستخدمين', color: 'hsl(var(--primary))' },
    requests: { label: 'الطلبات', color: 'hsl(var(--secondary))' },
    revenue: { label: 'الإيرادات', color: 'hsl(142, 76%, 36%)' },
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    growth, 
    subtitle 
  }: { 
    title: string; 
    value: number | string; 
    icon: React.ElementType; 
    growth?: number; 
    subtitle?: string;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {growth !== undefined && (
          <div className={`flex items-center text-sm mt-1 ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {growth >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
            <span>{Math.abs(growth)}% عن الشهر الماضي</span>
          </div>
        )}
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">إحصائيات المنصة</h1>
                <p className="text-muted-foreground">نظرة شاملة على أداء المنصة</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            title="إجمالي المستخدمين" 
            value={stats?.totalUsers || 0} 
            icon={Users} 
            growth={stats?.userGrowth}
          />
          <StatCard 
            title="إجمالي الطلبات" 
            value={stats?.totalRequests || 0} 
            icon={FileText} 
            growth={stats?.requestGrowth}
          />
          <StatCard 
            title="إجمالي الإيرادات" 
            value={`$${stats?.totalRevenue.toFixed(2) || '0.00'}`} 
            icon={DollarSign}
          />
          <StatCard 
            title="العمال الموثقين" 
            value={stats?.verifiedWorkers || 0} 
            icon={UserCheck}
            subtitle={`${stats?.pendingWorkers || 0} في انتظار التوثيق`}
          />
        </div>

        {/* Charts Section */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="users">المستخدمين</TabsTrigger>
            <TabsTrigger value="requests">الطلبات</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Monthly Trends Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>اتجاهات النمو الشهري</CardTitle>
                  <CardDescription>مقارنة النمو خلال الأشهر الستة الأخيرة</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <AreaChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area 
                        type="monotone" 
                        dataKey="users" 
                        stackId="1"
                        stroke="hsl(var(--primary))" 
                        fill="hsl(var(--primary))" 
                        fillOpacity={0.6}
                        name="المستخدمين"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="requests" 
                        stackId="2"
                        stroke="hsl(var(--secondary))" 
                        fill="hsl(var(--secondary))" 
                        fillOpacity={0.6}
                        name="الطلبات"
                      />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Revenue Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>الإيرادات الشهرية</CardTitle>
                  <CardDescription>إجمالي الإيرادات المحصلة شهرياً</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar 
                        dataKey="revenue" 
                        fill="hsl(142, 76%, 36%)" 
                        radius={[4, 4, 0, 0]}
                        name="الإيرادات"
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* User Type Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>توزيع أنواع المستخدمين</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={userTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {userTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* User Stats Cards */}
              <Card>
                <CardHeader>
                  <CardTitle>إحصائيات المستخدمين</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      <span>إجمالي العملاء</span>
                    </div>
                    <span className="font-bold">{stats?.totalClients}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-green-600" />
                      <span>عمال موثقين</span>
                    </div>
                    <span className="font-bold">{stats?.verifiedWorkers}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <UserX className="w-5 h-5 text-orange-500" />
                      <span>عمال بانتظار التوثيق</span>
                    </div>
                    <span className="font-bold">{stats?.pendingWorkers}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Growth Card */}
              <Card>
                <CardHeader>
                  <CardTitle>معدل نمو المستخدمين</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center h-[200px]">
                    <div className={`text-5xl font-bold ${(stats?.userGrowth || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stats?.userGrowth || 0}%
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                      {(stats?.userGrowth || 0) >= 0 ? (
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      )}
                      <span>مقارنة بالشهر الماضي</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="requests" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Request Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>حالات الطلبات</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={requestStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {requestStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Request Stats Cards */}
              <Card>
                <CardHeader>
                  <CardTitle>إحصائيات الطلبات</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-yellow-600" />
                      <span>طلبات معلقة</span>
                    </div>
                    <span className="font-bold">{stats?.pendingRequests}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span>طلبات مكتملة</span>
                    </div>
                    <span className="font-bold">{stats?.completedRequests}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-600" />
                      <span>طلبات ملغية</span>
                    </div>
                    <span className="font-bold">{stats?.cancelledRequests}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Request Growth Card */}
              <Card>
                <CardHeader>
                  <CardTitle>معدل نمو الطلبات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center h-[200px]">
                    <div className={`text-5xl font-bold ${(stats?.requestGrowth || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stats?.requestGrowth || 0}%
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                      {(stats?.requestGrowth || 0) >= 0 ? (
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      )}
                      <span>مقارنة بالشهر الماضي</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Requests Chart */}
            <Card>
              <CardHeader>
                <CardTitle>الطلبات الشهرية</CardTitle>
                <CardDescription>عدد الطلبات المستلمة كل شهر</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar 
                      dataKey="requests" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                      name="الطلبات"
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminStats;
