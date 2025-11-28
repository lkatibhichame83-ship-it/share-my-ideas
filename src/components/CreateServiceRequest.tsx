import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';

interface CreateServiceRequestProps {
  workerId: string;
  triggerButton?: React.ReactNode;
}

const CreateServiceRequest = ({ workerId, triggerButton }: CreateServiceRequestProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: 'تنبيه',
        description: 'يجب تسجيل الدخول لإنشاء طلب',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.title.trim() || !formData.description.trim()) {
      toast({
        title: 'تنبيه',
        description: 'يرجى ملء جميع الحقول المطلوبة',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('service_requests').insert({
        client_id: user.id,
        worker_id: workerId,
        title: formData.title.trim(),
        description: formData.description.trim(),
        budget: formData.budget ? parseFloat(formData.budget) : null,
        status: 'pending',
      });

      if (error) throw error;

      toast({
        title: 'نجح',
        description: 'تم إرسال طلب الخدمة بنجاح',
      });

      setFormData({ title: '', description: '', budget: '' });
      setOpen(false);
    } catch (error) {
      console.error('Error creating service request:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ في إنشاء الطلب',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button className="w-full">
            <Plus className="ml-2 h-5 w-5" />
            إنشاء طلب خدمة
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>طلب خدمة جديد</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">عنوان الطلب *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="مثال: إصلاح كهرباء المنزل"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">وصف الطلب *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="اشرح تفاصيل العمل المطلوب..."
              rows={5}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget">الميزانية (اختياري)</Label>
            <Input
              id="budget"
              type="number"
              step="0.01"
              min="0"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              placeholder="0.00"
            />
            <p className="text-sm text-muted-foreground">أدخل المبلغ بالريال السعودي</p>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'جاري الإرسال...' : 'إرسال الطلب'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateServiceRequest;