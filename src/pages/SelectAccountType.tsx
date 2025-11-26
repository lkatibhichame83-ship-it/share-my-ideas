import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Users, Briefcase } from 'lucide-react';

const SelectAccountType = () => {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<'client' | 'worker' | null>(null);

  const handleContinue = () => {
    if (selectedType) {
      navigate('/signup', { state: { accountType: selectedType } });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-secondary/30 to-background">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            مرحباً بك في منصة الخدمات
          </h1>
          <p className="text-muted-foreground text-lg">اختر نوع حسابك للمتابعة</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card
            className={`p-8 cursor-pointer transition-all duration-300 hover:shadow-lg ${
              selectedType === 'client'
                ? 'border-primary border-2 shadow-[0_0_20px_rgba(139,92,246,0.3)]'
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => setSelectedType('client')}
          >
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-soft">
                <Users className="w-10 h-10 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold">حساب زبون</h2>
              <p className="text-muted-foreground">
                أطلب خدمات منزلية وحرفية من عمال محترفين وموثوقين
              </p>
              <ul className="text-right space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  طلب خدمات متنوعة
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  تتبع العامل عبر GPS
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  دفع آمن إلكترونياً
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  تقييم الخدمات
                </li>
              </ul>
            </div>
          </Card>

          <Card
            className={`p-8 cursor-pointer transition-all duration-300 hover:shadow-lg ${
              selectedType === 'worker'
                ? 'border-primary border-2 shadow-[0_0_20px_rgba(139,92,246,0.3)]'
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => setSelectedType('worker')}
          >
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-soft">
                <Briefcase className="w-10 h-10 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold">حساب عامل / عاملة</h2>
              <p className="text-muted-foreground">
                قدم خدماتك واحصل على دخل ثابت من خلال منصتنا الاحترافية
              </p>
              <ul className="text-right space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  استقبال طلبات الخدمات
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  بناء سمعة مهنية
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  استلام الأموال فوراً
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  عمل مرن ومستقل
                </li>
              </ul>
            </div>
          </Card>
        </div>

        <div className="flex justify-center">
          <Button
            onClick={handleContinue}
            disabled={!selectedType}
            size="lg"
            className="px-12 py-6 text-lg shadow-medium hover:shadow-soft transition-all"
          >
            متابعة
          </Button>
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            لديك حساب بالفعل؟{' '}
            <a href="/login" className="text-primary hover:underline font-medium">
              تسجيل الدخول
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SelectAccountType;
