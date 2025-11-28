import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Clock, CheckCircle, XCircle, DollarSign, MessageCircle, ArrowRight } from 'lucide-react';

interface ServiceRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  budget: number | null;
  created_at: string;
  worker: {
    full_name: string;
    avatar_url: string | null;
    specialization: string;
  };
  client: {
    full_name: string;
    avatar_url: string | null;
  };
}

const ServiceRequests = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountType, setAccountType] = useState<'worker' | 'client' | null>(null);
  const [selectedTab, setSelectedTab] = useState('all');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadAccountType();
    fetchRequests();
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

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('service_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const requestsWithProfiles = await Promise.all(
        (data || []).map(async (req) => {
          const { data: workerProfile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', req.worker_id)
            .single();

          const { data: workerData } = await supabase
            .from('worker_profiles')
            .select('specialization')
            .eq('user_id', req.worker_id)
            .single();

          const { data: clientProfile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', req.client_id)
            .single();

          return {
            ...req,
            worker: {
              ...workerProfile,
              specialization: workerData?.specialization || 'غير محدد',
            },
            client: clientProfile,
          };
        })
      );

      setRequests(requestsWithProfiles);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ في تحميل الطلبات',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (requestId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('service_requests')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'تم التحديث',
        description: 'تم تحديث حالة الطلب بنجاح',
      });

      fetchRequests();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ في تحديث الحالة',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'accepted':
      case 'in_progress':
        return <CheckCircle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelled':
      case 'rejected':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'قيد الانتظار',
      accepted: 'مقبول',
      in_progress: 'جاري العمل',
      completed: 'مكتمل',
      cancelled: 'ملغي',
      rejected: 'مرفوض',
    };
    return statusMap[status] || status;
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'accepted':
      case 'in_progress':
        return 'default';
      case 'completed':
        return 'outline';
      case 'cancelled':
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const filteredRequests = requests.filter((req) => {
    if (selectedTab === 'all') return true;
    return req.status === selectedTab;
  });

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
            <h1 className="text-4xl font-bold text-foreground mb-2">طلبات الخدمة</h1>
            <p className="text-muted-foreground">إدارة جميع طلبات الخدمة الخاصة بك</p>
          </div>
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowRight className="ml-2 h-4 w-4" />
            العودة للرئيسية
          </Button>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="all">الكل</TabsTrigger>
            <TabsTrigger value="pending">قيد الانتظار</TabsTrigger>
            <TabsTrigger value="accepted">مقبول</TabsTrigger>
            <TabsTrigger value="in_progress">جاري العمل</TabsTrigger>
            <TabsTrigger value="completed">مكتمل</TabsTrigger>
            <TabsTrigger value="cancelled">ملغي</TabsTrigger>
          </TabsList>
        </Tabs>

        {filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground text-lg">لا توجد طلبات</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <Card key={request.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <Avatar className="h-12 w-12">
                        <AvatarImage
                          src={
                            accountType === 'worker'
                              ? request.client.avatar_url || ''
                              : request.worker.avatar_url || ''
                          }
                        />
                        <AvatarFallback>
                          {accountType === 'worker'
                            ? request.client.full_name.charAt(0)
                            : request.worker.full_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-xl">{request.title}</CardTitle>
                          <Badge variant={getStatusVariant(request.status)}>
                            {getStatusIcon(request.status)}
                            <span className="mr-1">{getStatusText(request.status)}</span>
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {accountType === 'worker' ? 'من: ' : 'إلى: '}
                          <span className="font-medium text-foreground">
                            {accountType === 'worker'
                              ? request.client.full_name
                              : request.worker.full_name}
                          </span>
                          {accountType === 'client' && (
                            <span className="mr-2">• {request.worker.specialization}</span>
                          )}
                        </p>
                        <p className="text-muted-foreground text-sm mb-3">{request.description}</p>
                        <div className="flex items-center gap-4 text-sm">
                          {request.budget && (
                            <div className="flex items-center gap-1 text-primary font-semibold">
                              <DollarSign className="h-4 w-4" />
                              {request.budget} ريال
                            </div>
                          )}
                          <span className="text-muted-foreground">
                            {new Date(request.created_at).toLocaleDateString('ar-SA')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/messages?request=${request.id}`)}
                    >
                      <MessageCircle className="ml-2 h-4 w-4" />
                      المحادثة
                    </Button>

                    {accountType === 'worker' && request.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(request.id, 'accepted')}
                        >
                          قبول الطلب
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleStatusUpdate(request.id, 'rejected')}
                        >
                          رفض الطلب
                        </Button>
                      </>
                    )}

                    {accountType === 'worker' && request.status === 'accepted' && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(request.id, 'in_progress')}
                      >
                        بدء العمل
                      </Button>
                    )}

                    {accountType === 'worker' && request.status === 'in_progress' && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(request.id, 'completed')}
                      >
                        إنهاء العمل
                      </Button>
                    )}

                    {accountType === 'client' && request.status === 'pending' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleStatusUpdate(request.id, 'cancelled')}
                      >
                        إلغاء الطلب
                      </Button>
                    )}

                    {request.status === 'completed' && (
                      <Button variant="outline" size="sm">
                        عرض الدفع
                      </Button>
                    )}
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

export default ServiceRequests;