import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';

interface DocumentUploadProps {
  documentType: 'id_card' | 'certificate' | 'police_record';
  label: string;
  onUploadComplete: () => void;
}

export const DocumentUpload = ({ documentType, label, onUploadComplete }: DocumentUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [document, setDocument] = useState<{ url: string; status: string } | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      if (!user) {
        toast({ title: 'خطأ', description: 'يجب تسجيل الدخول أولاً', variant: 'destructive' });
        return;
      }

      const file = e.target.files[0];
      
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: 'خطأ', description: 'حجم الملف يجب أن يكون أقل من 10 ميجابايت', variant: 'destructive' });
        return;
      }

      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${documentType}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          document_type: documentType,
          document_url: publicUrl,
          status: 'pending'
        });

      if (dbError) throw dbError;

      setDocument({ url: publicUrl, status: 'pending' });
      onUploadComplete();
      
      toast({ title: 'نجح', description: 'تم رفع الوثيقة بنجاح وهي قيد المراجعة' });
    } catch (error: any) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('user_id', user.id)
        .eq('document_type', documentType);

      if (error) throw error;

      setDocument(null);
      toast({ title: 'نجح', description: 'تم حذف الوثيقة' });
    } catch (error: any) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { label: 'قيد المراجعة', variant: 'secondary' as const },
      verified: { label: 'موثق', variant: 'default' as const },
      rejected: { label: 'مرفوض', variant: 'destructive' as const }
    };
    const config = variants[status as keyof typeof variants] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {document ? (
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium">تم رفع الوثيقة</p>
              {getStatusBadge(document.status)}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleRemove}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <label className="flex items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors">
          <div className="flex items-center gap-3">
            {uploading ? (
              <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
            ) : (
              <Upload className="w-6 h-6 text-muted-foreground" />
            )}
            <div className="text-sm">
              <p className="font-semibold">رفع {label}</p>
              <p className="text-xs text-muted-foreground">PDF, JPG, PNG (حد أقصى 10MB)</p>
            </div>
          </div>
          <input
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,application/pdf"
            onChange={handleFileSelect}
            disabled={uploading}
          />
        </label>
      )}
    </div>
  );
};
