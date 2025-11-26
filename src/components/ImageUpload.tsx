import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ImageUploadProps {
  bucket: string;
  onUploadComplete: (url: string) => void;
  currentImage?: string;
  className?: string;
}

export const ImageUpload = ({ bucket, onUploadComplete, currentImage, className }: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
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
      
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: 'خطأ', description: 'حجم الملف يجب أن يكون أقل من 5 ميجابايت', variant: 'destructive' });
        return;
      }

      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      setPreview(publicUrl);
      onUploadComplete(publicUrl);
      
      toast({ title: 'نجح', description: 'تم رفع الصورة بنجاح' });
    } catch (error: any) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onUploadComplete('');
  };

  return (
    <div className={className}>
      {preview ? (
        <div className="relative">
          <img 
            src={preview} 
            alt="Preview" 
            className="w-full h-48 object-cover rounded-lg"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={handleRemove}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {uploading ? (
              <Loader2 className="w-10 h-10 mb-3 text-muted-foreground animate-spin" />
            ) : (
              <Upload className="w-10 h-10 mb-3 text-muted-foreground" />
            )}
            <p className="mb-2 text-sm text-muted-foreground">
              <span className="font-semibold">اضغط للرفع</span> أو اسحب الملف
            </p>
            <p className="text-xs text-muted-foreground">PNG, JPG, WEBP (حد أقصى 5MB)</p>
          </div>
          <input
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            disabled={uploading}
          />
        </label>
      )}
    </div>
  );
};
