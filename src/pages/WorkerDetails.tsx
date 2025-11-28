import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Star, Briefcase, DollarSign, Phone, Shield, ArrowRight, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import CreateServiceRequest from '@/components/CreateServiceRequest';

interface WorkerData {
  id: string;
  user_id: string;
  specialization: string;
  description: string | null;
  experience_years: number | null;
  hourly_rate: number | null;
  is_verified: boolean | null;
  video_url: string | null;
  profile: {
    full_name: string;
    avatar_url: string | null;
    phone_number: string | null;
  };
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  client: {
    full_name: string;
    avatar_url: string | null;
  };
}

const WorkerDetails = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [worker, setWorker] = useState<WorkerData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchWorkerDetails();
      fetchReviews();
    }
  }, [userId]);

  const fetchWorkerDetails = async () => {
    try {
      const { data: workerData, error: workerError } = await supabase
        .from('worker_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (workerError) throw workerError;

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, phone_number')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      setWorker({
        ...workerData,
        profile: profileData,
      });
    } catch (error) {
      console.error('Error fetching worker:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ في تحميل بيانات العامل',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const { data: reviewData, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('worker_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch client profiles for each review
      const reviewsWithProfiles = await Promise.all(
        (reviewData || []).map(async (review) => {
          const { data: clientProfile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', review.client_id)
            .single();

          return {
            ...review,
            client: clientProfile || { full_name: 'مستخدم محذوف', avatar_url: null },
          };
        })
      );

      setReviews(reviewsWithProfiles);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const handleSubmitReview = async () => {
    if (!user) {
      toast({
        title: 'تنبيه',
        description: 'يجب تسجيل الدخول لإضافة تقييم',
        variant: 'destructive',
      });
      return;
    }

    if (newRating === 0) {
      toast({
        title: 'تنبيه',
        description: 'يرجى اختيار التقييم',
        variant: 'destructive',
      });
      return;
    }

    setSubmittingReview(true);

    try {
      const { error } = await supabase.from('reviews').insert({
        worker_id: userId!,
        client_id: user.id,
        rating: newRating,
        comment: newComment || null,
      });

      if (error) throw error;

      toast({
        title: 'نجح',
        description: 'تم إضافة التقييم بنجاح',
      });

      setNewRating(0);
      setNewComment('');
      fetchReviews();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ في إضافة التقييم',
        variant: 'destructive',
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xl text-muted-foreground">جاري التحميل...</div>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xl text-muted-foreground">العامل غير موجود</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/workers')}
          className="mb-6"
        >
          <ArrowRight className="ml-2 h-4 w-4" />
          العودة للقائمة
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Worker Info */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="text-center">
                <Avatar className="h-32 w-32 mx-auto mb-4">
                  <AvatarImage src={worker.profile.avatar_url || ''} />
                  <AvatarFallback className="text-4xl">
                    {worker.profile.full_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <h1 className="text-2xl font-bold text-foreground">
                    {worker.profile.full_name}
                  </h1>
                  {worker.is_verified && (
                    <Shield className="h-5 w-5 text-primary" />
                  )}
                </div>
                <Badge variant="secondary" className="mb-4">
                  {worker.specialization}
                </Badge>
                <div className="flex items-center justify-center gap-1 mb-4">
                  <Star className="h-5 w-5 fill-primary text-primary" />
                  <span className="text-xl font-bold text-foreground">
                    {averageRating.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground">
                    ({reviews.length} تقييم)
                  </span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {worker.experience_years && (
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-5 w-5 text-muted-foreground" />
                    <span className="text-foreground">
                      {worker.experience_years} سنوات خبرة
                    </span>
                  </div>
                )}

                {worker.hourly_rate && (
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xl font-bold text-primary">
                      {worker.hourly_rate} ريال/ساعة
                    </span>
                  </div>
                )}

                {worker.profile.phone_number && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <span className="text-foreground" dir="ltr">
                      {worker.profile.phone_number}
                    </span>
                  </div>
                )}

                {user && user.id !== worker.user_id && (
                  <CreateServiceRequest workerId={worker.user_id} />
                )}

                <Button className="w-full" size="lg" variant="outline">
                  <MessageCircle className="ml-2 h-5 w-5" />
                  تواصل الآن
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Details and Reviews */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <Card>
              <CardHeader>
                <h2 className="text-2xl font-bold text-foreground">نبذة عني</h2>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {worker.description || 'لا يوجد وصف متاح'}
                </p>
              </CardContent>
            </Card>

            {/* Add Review */}
            {user && user.id !== worker.user_id && (
              <Card>
                <CardHeader>
                  <h2 className="text-2xl font-bold text-foreground">أضف تقييمك</h2>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-8 w-8 cursor-pointer transition-colors ${
                          star <= newRating
                            ? 'fill-primary text-primary'
                            : 'text-muted-foreground'
                        }`}
                        onClick={() => setNewRating(star)}
                      />
                    ))}
                  </div>
                  <Textarea
                    placeholder="اكتب تعليقك هنا..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={4}
                  />
                  <Button
                    onClick={handleSubmitReview}
                    disabled={submittingReview || newRating === 0}
                  >
                    {submittingReview ? 'جاري الإضافة...' : 'إضافة التقييم'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Reviews List */}
            <Card>
              <CardHeader>
                <h2 className="text-2xl font-bold text-foreground">
                  التقييمات ({reviews.length})
                </h2>
              </CardHeader>
              <CardContent className="space-y-4">
                {reviews.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    لا توجد تقييمات بعد
                  </p>
                ) : (
                  reviews.map((review) => (
                    <div
                      key={review.id}
                      className="border-b border-border pb-4 last:border-0"
                    >
                      <div className="flex items-start gap-3 mb-2">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={review.client.avatar_url || ''} />
                          <AvatarFallback>
                            {review.client.full_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-foreground">
                              {review.client.full_name}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {new Date(review.created_at).toLocaleDateString('ar-SA')}
                            </span>
                          </div>
                          <div className="flex gap-1 mb-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating
                                    ? 'fill-primary text-primary'
                                    : 'text-muted-foreground'
                                }`}
                              />
                            ))}
                          </div>
                          {review.comment && (
                            <p className="text-muted-foreground text-sm">
                              {review.comment}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerDetails;
