import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ImageUpload } from '@/components/ImageUpload';
import { DocumentUpload } from '@/components/DocumentUpload';
import { ArrowRight, Save, Star, BarChart3 } from 'lucide-react';

const WorkerProfile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [workerProfile, setWorkerProfile] = useState<any>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    avatarUrl: '',
    specialization: '',
    experienceYears: 0,
    description: '',
    hourlyRate: '',
    videoUrl: '',
  });

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .single();

      if (profileError) throw profileError;

      if (profileData.account_type !== 'worker') {
        toast({ title: 'خطأ', description: 'هذه الصفحة مخصصة للعمال فقط', variant: 'destructive' });
        navigate('/');
        return;
      }

      setProfile(profileData);

      const { data: workerData } = await supabase
        .from('worker_profiles')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      setWorkerProfile(workerData);

      setFormData({
        fullName: profileData.full_name || '',
        phoneNumber: profileData.phone_number || '',
        avatarUrl: profileData.avatar_url || '',
        specialization: workerData?.specialization || '',
        experienceYears: workerData?.experience_years || 0,
        description: workerData?.description || '',
        hourlyRate: workerData?.hourly_rate?.toString() || '',
        videoUrl: workerData?.video_url || '',
      });
    } catch (error: any) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName,
          phone_number: formData.phoneNumber,
          avatar_url: formData.avatarUrl,
        })
        .eq('id', user!.id);

      if (profileError) throw profileError;

      if (workerProfile) {
        const { error: workerError } = await supabase
          .from('worker_profiles')
          .update({
            specialization: formData.specialization,
            experience_years: parseInt(formData.experienceYears.toString()),
            description: formData.description,
            hourly_rate: parseFloat(formData.hourlyRate) || null,
            video_url: formData.videoUrl,
          })
          .eq('user_id', user!.id);

        if (workerError) throw workerError;
      } else {
        const { error: workerError } = await supabase
          .from('worker_profiles')
          .insert({
            user_id: user!.id,
            specialization: formData.specialization,
            experience_years: parseInt(formData.experienceYears.toString()),
            description: formData.description,
            hourly_rate: parseFloat(formData.hourlyRate) || null,
            video_url: formData.videoUrl,
          });

        if (workerError) throw workerError;
      }

      toast({ title: 'نجح', description: 'تم حفظ البروفايل بنجاح' });
      loadProfile();
    } catch (error: any) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      <nav className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowRight className="w-4 h-4 ml-2" />
            العودة للرئيسية
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate('/worker-stats')}
            className="gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            لوحة الإحصائيات
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl text-center bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              البروفايل المهني
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Star className="w-5 h-5 text-primary" />
                  المعلومات الأساسية
                </h3>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">الاسم الكامل *</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      required
                      dir="rtl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">رقم الهاتف</Label>
                    <Input
                      id="phoneNumber"
                      name="phoneNumber"
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>صورة البروفايل</Label>
                  <ImageUpload
                    bucket="profiles"
                    currentImage={formData.avatarUrl}
                    onUploadComplete={(url) => setFormData({ ...formData, avatarUrl: url })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Star className="w-5 h-5 text-primary" />
                  المعلومات المهنية
                </h3>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="specialization">التخصص *</Label>
                    <Input
                      id="specialization"
                      name="specialization"
                      value={formData.specialization}
                      onChange={handleChange}
                      placeholder="مثال: كهربائي، سباك، نجار..."
                      required
                      dir="rtl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="experienceYears">سنوات الخبرة</Label>
                    <Input
                      id="experienceYears"
                      name="experienceYears"
                      type="number"
                      min="0"
                      value={formData.experienceYears}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hourlyRate">السعر بالساعة (درهم)</Label>
                    <Input
                      id="hourlyRate"
                      name="hourlyRate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.hourlyRate}
                      onChange={handleChange}
                      placeholder="100.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="videoUrl">رابط فيديو تعريفي (اختياري)</Label>
                    <Input
                      id="videoUrl"
                      name="videoUrl"
                      type="url"
                      value={formData.videoUrl}
                      onChange={handleChange}
                      placeholder="https://youtube.com/..."
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">نبذة عنك وعن خبراتك</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    placeholder="اكتب نبذة مختصرة عن خبراتك ومهاراتك..."
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Star className="w-5 h-5 text-primary" />
                  الوثائق
                </h3>

                <div className="space-y-4">
                  <DocumentUpload
                    documentType="id_card"
                    label="بطاقة التعريف الوطنية"
                    onUploadComplete={() => {}}
                  />
                  <DocumentUpload
                    documentType="certificate"
                    label="شهادة مهنية (اختياري)"
                    onUploadComplete={() => {}}
                  />
                  <DocumentUpload
                    documentType="police_record"
                    label="شهادة حسن السيرة (اختياري)"
                    onUploadComplete={() => {}}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                <Save className="w-4 h-4 ml-2" />
                {loading ? 'جاري الحفظ...' : 'حفظ البروفايل'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default WorkerProfile;
