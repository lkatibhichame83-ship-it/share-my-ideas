import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LogOut, User, Settings, Users, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const Home = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadAccountType();
    }
  }, [user]);

  const loadAccountType = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('account_type')
        .eq('id', user!.id)
        .single();
      
      if (data) {
        setAccountType(data.account_type);
      }
    } catch (error) {
      console.error('Error loading account type:', error);
    }
  };

  const handleProfileClick = () => {
    if (accountType === 'worker') {
      navigate('/worker-profile');
    } else {
      navigate('/client-profile');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      <nav className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            منصة الخدمات
          </h1>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/workers')}>
                  <Users className="w-4 h-4 ml-2" />
                  العمال
                </Button>
                <Button variant="outline" size="sm" onClick={handleProfileClick}>
                  <Settings className="w-4 h-4 ml-2" />
                  البروفايل
                </Button>
                <Button variant="outline" size="sm" onClick={signOut}>
                  <LogOut className="w-4 h-4 ml-2" />
                  تسجيل الخروج
                </Button>
              </>
            ) : (
              <Button onClick={() => navigate('/login')}>تسجيل الدخول</Button>
            )}
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              مرحباً بك في منصة الخدمات
            </h2>
            <p className="text-xl text-muted-foreground">
              الطريقة الأسهل والأكثر أماناً للحصول على خدمات منزلية وحرفية احترافية
            </p>
          </div>

          {!user && (
            <div className="flex justify-center gap-4">
              <Button size="lg" onClick={() => navigate('/select-account-type')}>
                ابدأ الآن
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/login')}>
                تسجيل الدخول
              </Button>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <Card className="p-6 space-y-3 hover:shadow-medium transition-shadow">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="text-xl font-bold">آمن وموثوق</h3>
              <p className="text-muted-foreground">
                جميع العمال موثقون ومعتمدون لضمان أمانك وراحتك
              </p>
            </Card>

            <Card className="p-6 space-y-3 hover:shadow-medium transition-shadow">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <span className="text-2xl">💳</span>
              </div>
              <h3 className="text-xl font-bold">دفع إلكتروني</h3>
              <p className="text-muted-foreground">
                دفع آمن ومضمون عبر المنصة مع فواتير إلكترونية
              </p>
            </Card>

            <Card className="p-6 space-y-3 hover:shadow-medium transition-shadow">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <span className="text-2xl">⭐</span>
              </div>
              <h3 className="text-xl font-bold">تقييمات حقيقية</h3>
              <p className="text-muted-foreground">
                اختر العامل المناسب بناءً على تقييمات العملاء السابقين
              </p>
            </Card>
          </div>

          {user && (
            <div className="grid md:grid-cols-2 gap-6 mt-12">
              <Card className="p-8 hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-2">تصفح العمال</h3>
                <p className="text-muted-foreground mb-4">
                  اكتشف أفضل العمال المحترفين في جميع المجالات
                </p>
                <Button className="w-full" onClick={() => navigate('/workers')}>
                  تصفح الآن
                </Button>
              </Card>

              <Card className="p-8 hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-2">ملفي الشخصي</h3>
                <p className="text-muted-foreground mb-4">
                  قم بإدارة معلوماتك ووثائقك الشخصية
                </p>
                <Button className="w-full" variant="outline" onClick={handleProfileClick}>
                  الذهاب للبروفايل
                </Button>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Home;
