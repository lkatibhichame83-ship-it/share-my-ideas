import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, Search, MapPin, Briefcase, DollarSign, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface WorkerProfile {
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
  average_rating: number;
  review_count: number;
}

const WorkerList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [filteredWorkers, setFilteredWorkers] = useState<WorkerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [specializationFilter, setSpecializationFilter] = useState('all');
  const [sortBy, setSortBy] = useState('rating');

  useEffect(() => {
    fetchWorkers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, specializationFilter, sortBy, workers]);

  const fetchWorkers = async () => {
    try {
      const { data: workerData, error } = await supabase
        .from('worker_profiles')
        .select('*');

      if (error) throw error;

      // Fetch profiles and reviews for each worker
      const workersWithRatings = await Promise.all(
        (workerData || []).map(async (worker) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, phone_number')
            .eq('id', worker.user_id)
            .single();

          const { data: reviews } = await supabase
            .from('reviews')
            .select('rating')
            .eq('worker_id', worker.user_id);

          const average_rating = reviews && reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0;

          return {
            ...worker,
            profile: profile || { full_name: 'غير معروف', avatar_url: null, phone_number: null },
            average_rating,
            review_count: reviews?.length || 0,
          };
        })
      );

      setWorkers(workersWithRatings);
      setFilteredWorkers(workersWithRatings);
    } catch (error) {
      console.error('Error fetching workers:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ في تحميل العمال',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...workers];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (worker) =>
          worker.profile.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          worker.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
          worker.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Specialization filter
    if (specializationFilter !== 'all') {
      filtered = filtered.filter(
        (worker) => worker.specialization === specializationFilter
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.average_rating - a.average_rating;
        case 'price_low':
          return (a.hourly_rate || 0) - (b.hourly_rate || 0);
        case 'price_high':
          return (b.hourly_rate || 0) - (a.hourly_rate || 0);
        case 'experience':
          return (b.experience_years || 0) - (a.experience_years || 0);
        default:
          return 0;
      }
    });

    setFilteredWorkers(filtered);
  };

  const getSpecializations = () => {
    const specs = workers.map((w) => w.specialization);
    return ['all', ...Array.from(new Set(specs))];
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">العمال المتاحون</h1>
          <p className="text-muted-foreground">ابحث عن العامل المناسب لاحتياجاتك</p>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="relative md:col-span-2">
            <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث بالاسم أو التخصص..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>

          <Select value={specializationFilter} onValueChange={setSpecializationFilter}>
            <SelectTrigger>
              <SelectValue placeholder="التخصص" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع التخصصات</SelectItem>
              {getSpecializations()
                .filter((s) => s !== 'all')
                .map((spec) => (
                  <SelectItem key={spec} value={spec}>
                    {spec}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue placeholder="ترتيب حسب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">التقييم الأعلى</SelectItem>
              <SelectItem value="price_low">السعر الأقل</SelectItem>
              <SelectItem value="price_high">السعر الأعلى</SelectItem>
              <SelectItem value="experience">الخبرة الأكثر</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Workers Grid */}
        {filteredWorkers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground text-lg">لا توجد نتائج مطابقة للبحث</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWorkers.map((worker) => (
              <Card
                key={worker.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/worker/${worker.user_id}`)}
              >
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={worker.profile.avatar_url || ''} />
                      <AvatarFallback>
                        {worker.profile.full_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg text-foreground">
                          {worker.profile.full_name}
                        </h3>
                        {worker.is_verified && (
                          <Shield className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <Badge variant="secondary" className="mb-2">
                        {worker.specialization}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-primary text-primary" />
                        <span className="text-sm font-medium text-foreground">
                          {worker.average_rating.toFixed(1)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          ({worker.review_count} تقييم)
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                    {worker.description || 'لا يوجد وصف'}
                  </p>

                  <div className="space-y-2">
                    {worker.experience_years && (
                      <div className="flex items-center gap-2 text-sm">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {worker.experience_years} سنوات خبرة
                        </span>
                      </div>
                    )}

                    {worker.hourly_rate && (
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-bold text-primary">
                          {worker.hourly_rate} ريال/ساعة
                        </span>
                      </div>
                    )}
                  </div>

                  <Button className="w-full mt-4">
                    عرض الملف الشخصي
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkerList;
