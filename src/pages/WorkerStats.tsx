import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight, TrendingUp, DollarSign, Star, CheckCircle, Calendar } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ar } from 'date-fns/locale';

interface MonthlyData {
  month: string;
  completedRequests: number;
  earnings: number;
  averageRating: number;
}

interface StatsData {
  totalCompleted: number;
  totalEarnings: number;
  averageRating: number;
  totalReviews: number;
  monthlyData: MonthlyData[];
  statusBreakdown: { name: string; value: number; color: string }[];
}

const WorkerStats = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    try {
      setLoading(true);

      // Check if user is a worker
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_type')
        .eq('id', user!.id)
        .single();

      if (profile?.account_type !== 'worker') {
        toast({ 
          title: 'خطأ', 
          description: 'هذه الصفحة مخصصة للعمال فقط', 
          variant: 'destructive' 
        });
        navigate('/');
        return;
      }

      // Get last 6 months data
      const monthsData: MonthlyData[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const monthStart = startOfMonth(date);
        const monthEnd = endOfMonth(date);

        // Get completed requests for this month
        const { data: requests } = await supabase
          .from('service_requests')
          .select('id')
          .eq('worker_id', user!.id)
          .eq('status', 'completed')
          .gte('completed_at', monthStart.toISOString())
          .lte('completed_at', monthEnd.toISOString());

        // Get earnings for this month
        const { data: payments } = await supabase
          .from('payments')
          .select('amount')
          .eq('worker_id', user!.id)
          .eq('status', 'paid')
          .gte('paid_at', monthStart.toISOString())
          .lte('paid_at', monthEnd.toISOString());

        // Get average rating for this month
        const { data: reviews } = await supabase
          .from('reviews')
          .select('rating')
          .eq('worker_id', user!.id)
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString());

        const avgRating = reviews && reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0;

        monthsData.push({
          month: format(date, 'MMM', { locale: ar }),
          completedRequests: requests?.length || 0,
          earnings: payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0,
          averageRating: Number(avgRating.toFixed(1)),
        });
      }

      // Get total completed requests
      const { data: allCompleted } = await supabase
        .from('service_requests')
        .select('id')
        .eq('worker_id', user!.id)
        .eq('status', 'completed');

      // Get total earnings
      const { data: allPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('worker_id', user!.id)
        .eq('status', 'paid');

      // Get all reviews
      const { data: allReviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('worker_id', user!.id);

      const avgRating = allReviews && allReviews.length > 0
        ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
        : 0;

      // Get status breakdown
      const { data: statusData } = await supabase
        .from('service_requests')
        .select('status')
        .eq('worker_id', user!.id);

      const statusCounts: Record<string, number> = {};
      statusData?.forEach(item => {
        statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
      });

      const statusColors: Record<string, string> = {
        pending: 'hsl(39, 100%, 57%)',
        in_progress: 'hsl(217, 91%, 60%)',
        completed: 'hsl(142, 76%, 36%)',
        cancelled: 'hsl(0, 84%, 60%)',
      };

      const statusLabels: Record<string, string> = {
        pending: 'قيد الانتظار',
        in_progress: 'قيد التنفيذ',
        completed: 'مكتمل',
        cancelled: 'ملغي',
      };

      const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({
        name: statusLabels[status] || status,
        value: count,
        color: statusColors[status] || 'hsl(262, 83%, 58%)',
      }));

      setStats({
        totalCompleted: allCompleted?.length || 0,
        totalEarnings: allPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0,
        averageRating: Number(avgRating.toFixed(1)),
        totalReviews: allReviews?.length || 0,
        monthlyData: monthsData,
        statusBreakdown,
      });
    } catch (error: any) {
      toast({ 
        title: 'خطأ', 
        description: error.message, 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      <nav className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/worker-profile')}>
            <ArrowRight className="w-4 h-4 ml-2" />
            العودة للبروفايل
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              لوحة الإحصائيات
            </h1>
            <p className="text-muted-foreground">
              تحليل شامل لأدائك ونشاطك على المنصة
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-primary">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  الطلبات المكتملة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{stats.totalCompleted}</div>
                <p className="text-xs text-muted-foreground mt-1">إجمالي الطلبات المنجزة</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-accent">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  إجمالي الإيرادات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-accent">
                  {stats.totalEarnings.toFixed(2)} درهم
                </div>
                <p className="text-xs text-muted-foreground mt-1">الأرباح المحققة</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-yellow-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  متوسط التقييم
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">
                  {stats.averageRating} <span className="text-lg">★</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">من {stats.totalReviews} تقييم</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  معدل النمو
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {stats.monthlyData.length > 1
                    ? ((stats.monthlyData[stats.monthlyData.length - 1].completedRequests /
                        Math.max(stats.monthlyData[stats.monthlyData.length - 2].completedRequests, 1) - 1) * 100).toFixed(0)
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">مقارنة بالشهر السابق</p>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Earnings Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                الإيرادات الشهرية
              </CardTitle>
              <CardDescription>تتبع دخلك على مدار الأشهر الستة الماضية</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value.toFixed(2)} درهم`, 'الإيرادات']}
                  />
                  <Bar 
                    dataKey="earnings" 
                    fill="hsl(var(--primary))" 
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Completed Requests & Rating Trends */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  الطلبات المكتملة شهرياً
                </CardTitle>
                <CardDescription>عدد الطلبات المنجزة في كل شهر</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={stats.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="month" 
                      stroke="hsl(var(--muted-foreground))"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [value, 'عدد الطلبات']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="completedRequests" 
                      stroke="hsl(var(--accent))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--accent))', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-primary" />
                  تطور التقييمات
                </CardTitle>
                <CardDescription>متوسط التقييم الشهري</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={stats.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="month" 
                      stroke="hsl(var(--muted-foreground))"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      domain={[0, 5]}
                      stroke="hsl(var(--muted-foreground))"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`${value} ★`, 'التقييم']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="averageRating" 
                      stroke="hsl(39, 100%, 57%)" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(39, 100%, 57%)', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Status Breakdown */}
          {stats.statusBreakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  توزيع الطلبات حسب الحالة
                </CardTitle>
                <CardDescription>نظرة شاملة على جميع طلباتك</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={stats.statusBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="hsl(var(--primary))"
                        dataKey="value"
                      >
                        {stats.statusBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  <div className="space-y-2">
                    {stats.statusBreakdown.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm">
                          {item.name}: <strong>{item.value}</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default WorkerStats;
