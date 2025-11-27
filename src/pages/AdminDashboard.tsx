import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  FileText,
  Star,
  CheckCircle,
  XCircle,
  ArrowRight,
  Shield,
  TrendingUp,
} from 'lucide-react';

interface User {
  id: string;
  full_name: string;
  email: string;
  account_type: string;
  avatar_url: string | null;
  created_at: string;
}

interface Document {
  id: string;
  user_id: string;
  document_type: string;
  document_url: string;
  status: string;
  created_at: string;
  profile: {
    full_name: string;
  };
}

interface Stats {
  totalUsers: number;
  totalWorkers: number;
  totalClients: number;
  pendingDocuments: number;
  totalReviews: number;
  averageRating: number;
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalWorkers: 0,
    totalClients: 0,
    pendingDocuments: 0,
    totalReviews: 0,
    averageRating: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/');
      return;
    }

    if (isAdmin) {
      fetchDashboardData();
    }
  }, [isAdmin, adminLoading]);

  const fetchDashboardData = async () => {
    try {
      await Promise.all([fetchUsers(), fetchDocuments(), fetchStats()]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (profiles) {
      const usersWithEmails = await Promise.all(
        profiles.map(async (profile) => {
          const { data: authUser } = await supabase.auth.admin.getUserById(
            profile.id
          );
          return {
            ...profile,
            email: authUser?.user?.email || 'غير متوفر',
          };
        })
      );
      setUsers(usersWithEmails);
    }
  };

  const fetchDocuments = async () => {
    const { data } = await supabase
      .from('documents')
      .select('*, profile:profiles!documents_user_id_fkey(full_name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (data) {
      const docsWithProfiles = await Promise.all(
        data.map(async (doc) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', doc.user_id)
            .single();

          return {
            ...doc,
            profile: profile || { full_name: 'غير معروف' },
          };
        })
      );
      setDocuments(docsWithProfiles);
    }
  };

  const fetchStats = async () => {
    const [profilesData, reviewsData] = await Promise.all([
      supabase.from('profiles').select('account_type'),
      supabase.from('reviews').select('rating'),
    ]);

    const { data: pendingDocs } = await supabase
      .from('documents')
      .select('id', { count: 'exact' })
      .eq('status', 'pending');

    const profiles = profilesData.data || [];
    const reviews = reviewsData.data || [];

    setStats({
      totalUsers: profiles.length,
      totalWorkers: profiles.filter((p) => p.account_type === 'worker').length,
      totalClients: profiles.filter((p) => p.account_type === 'client').length,
      pendingDocuments: pendingDocs?.length || 0,
      totalReviews: reviews.length,
      averageRating:
        reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0,
    });
  };

  const handleDocumentAction = async (
    documentId: string,
    status: 'verified' | 'rejected'
  ) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update({ status })
        .eq('id', documentId);

      if (error) throw error;

      toast({
        title: 'تم بنجاح',
        description: `تم ${status === 'verified' ? 'قبول' : 'رفض'} الوثيقة`,
      });

      fetchDocuments();
      fetchStats();
    } catch (error) {
      console.error('Error updating document:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ في تحديث الوثيقة',
        variant: 'destructive',
      });
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xl text-muted-foreground">جاري التحميل...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            لوحة تحكم المدير
          </h1>
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowRight className="ml-2 h-4 w-4" />
            العودة للرئيسية
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                إجمالي المستخدمين
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {stats.totalUsers}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalWorkers} عامل • {stats.totalClients} زبون
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                الوثائق المعلقة
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {stats.pendingDocuments}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                بانتظار المراجعة
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                التقييمات
              </CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {stats.totalReviews}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                متوسط {stats.averageRating.toFixed(1)} نجوم
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                النمو
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">+12%</div>
              <p className="text-xs text-muted-foreground mt-1">هذا الشهر</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="documents" className="space-y-6">
          <TabsList>
            <TabsTrigger value="documents">الوثائق المعلقة</TabsTrigger>
            <TabsTrigger value="users">المستخدمين</TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="space-y-4">
            {documents.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">لا توجد وثائق معلقة</p>
                </CardContent>
              </Card>
            ) : (
              documents.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="py-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-foreground">
                            {doc.profile.full_name}
                          </h3>
                          <Badge variant="secondary">{doc.document_type}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          تم الرفع في:{' '}
                          {new Date(doc.created_at).toLocaleDateString('ar-SA')}
                        </p>
                        <a
                          href={doc.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          عرض الوثيقة
                        </a>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            handleDocumentAction(doc.id, 'verified')
                          }
                        >
                          <CheckCircle className="ml-2 h-4 w-4" />
                          قبول
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            handleDocumentAction(doc.id, 'rejected')
                          }
                        >
                          <XCircle className="ml-2 h-4 w-4" />
                          رفض
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            {users.map((user) => (
              <Card key={user.id}>
                <CardContent className="py-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.avatar_url || ''} />
                      <AvatarFallback>
                        {user.full_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-bold text-foreground">
                        {user.full_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          user.account_type === 'worker'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {user.account_type === 'worker' ? 'عامل' : 'زبون'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString('ar-SA')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
