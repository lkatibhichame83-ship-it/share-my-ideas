import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Clock, CheckCircle, XCircle, ArrowRight, CreditCard } from 'lucide-react';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  paid_at: string | null;
  service_request: {
    title: string;
  };
  worker: {
    full_name: string;
    avatar_url: string | null;
  };
  client: {
    full_name: string;
    avatar_url: string | null;
  };
}

const Payments = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountType, setAccountType] = useState<'worker' | 'client' | null>(null);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadAccountType();
    fetchPayments();
  }, [user]);

  const loadAccountType = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('account_type')
        .eq('id', user!.id)
        .single();
      setAccountType(data?.account_type as 'worker' | 'client');
    } catch (error) {
      console.error('Error loading account type:', error);
    }
  };

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const paymentsWithDetails = await Promise.all(
        (data || []).map(async (payment) => {
          const { data: serviceRequest } = await supabase
            .from('service_requests')
            .select('title')
            .eq('id', payment.service_request_id)
            .single();

          const { data: workerProfile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', payment.worker_id)
            .single();

          const { data: clientProfile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', payment.client_id)
            .single();

          return {
            ...payment,
            service_request: serviceRequest || { title: 'طلب محذوف' },
            worker: workerProfile || { full_name: 'مستخدم محذوف', avatar_url: null },
            client: clientProfile || { full_name: 'مستخدم محذوف', avatar_url: null },
          };
        })
      );

      setPayments(paymentsWithDetails);

      // Calculate totals
      const completedPayments = paymentsWithDetails.filter((p) => p.status === 'completed');
      const earnings = completedPayments
        .filter((p) => p.worker_id === user!.id)
        .reduce((sum, p) => sum + Number(p.amount), 0);
      const spent = completedPayments
        .filter((p) => p.client_id === user!.id)
        .reduce((sum, p) => sum + Number(p.amount), 0);

      setTotalEarnings(earnings);
      setTotalSpent(spent);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ في تحميل المدفوعات',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
      case 'refunded':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'قيد الانتظار',
      completed: 'مكتمل',
      failed: 'فشل',
      refunded: 'مسترد',
    };
    return statusMap[status] || status;
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'completed':
        return 'outline';
      case 'failed':
      case 'refunded':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xl text-muted-foreground">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">المدفوعات</h1>
            <p className="text-muted-foreground">سجل جميع المعاملات المالية</p>
          </div>
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowRight className="ml-2 h-4 w-4" />
            العودة للرئيسية
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {accountType === 'worker' && (
            <Card className="bg-gradient-primary text-primary-foreground">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-6 w-6" />
                  إجمالي الأرباح
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold">{totalEarnings.toFixed(2)} ريال</p>
              </CardContent>
            </Card>
          )}

          {accountType === 'client' && (
            <Card className="bg-gradient-primary text-primary-foreground">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-6 w-6" />
                  إجمالي المدفوعات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold">{totalSpent.toFixed(2)} ريال</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-6 w-6 text-muted-foreground" />
                المدفوعات المعلقة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-foreground">
                {payments.filter((p) => p.status === 'pending').length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Payments List */}
        {payments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CreditCard className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">لا توجد مدفوعات</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <Card key={payment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <Avatar className="h-12 w-12">
                        <AvatarImage
                          src={
                            accountType === 'worker'
                              ? payment.client.avatar_url || ''
                              : payment.worker.avatar_url || ''
                          }
                        />
                        <AvatarFallback>
                          {accountType === 'worker'
                            ? payment.client.full_name.charAt(0)
                            : payment.worker.full_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg text-foreground">
                            {payment.service_request.title}
                          </h3>
                          <Badge variant={getStatusVariant(payment.status)}>
                            {getStatusIcon(payment.status)}
                            <span className="mr-1">{getStatusText(payment.status)}</span>
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {accountType === 'worker' ? 'من: ' : 'إلى: '}
                          <span className="font-medium text-foreground">
                            {accountType === 'worker'
                              ? payment.client.full_name
                              : payment.worker.full_name}
                          </span>
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            {new Date(payment.created_at).toLocaleDateString('ar-SA')}
                          </span>
                          {payment.paid_at && (
                            <span className="text-muted-foreground">
                              دفعت في: {new Date(payment.paid_at).toLocaleDateString('ar-SA')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-3xl font-bold text-primary">
                        {Number(payment.amount).toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">{payment.currency}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Payments;