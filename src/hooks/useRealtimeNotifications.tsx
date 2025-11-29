import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';

export const useRealtimeNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const channels: RealtimeChannel[] = [];

    // الاستماع للرسائل الجديدة
    const messagesChannel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('رسالة جديدة:', payload);
          
          // جلب معلومات المرسل
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', payload.new.sender_id)
            .single();

          toast({
            title: '💬 رسالة جديدة',
            description: `من ${senderProfile?.full_name || 'مستخدم'}: ${payload.new.content}`,
            duration: 5000,
          });

          // تشغيل صوت الإشعار
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('رسالة جديدة', {
              body: `من ${senderProfile?.full_name || 'مستخدم'}`,
              icon: '/placeholder.svg',
            });
          }
        }
      )
      .subscribe();

    channels.push(messagesChannel);

    // الاستماع لتحديثات الطلبات (للعملاء)
    const clientRequestsChannel = supabase
      .channel('client-requests-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'service_requests',
          filter: `client_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('تحديث طلب (عميل):', payload);
          
          const oldStatus = payload.old.status;
          const newStatus = payload.new.status;

          if (oldStatus !== newStatus) {
            const statusMessages: Record<string, string> = {
              'pending': 'قيد الانتظار',
              'accepted': 'تم القبول',
              'in_progress': 'قيد التنفيذ',
              'completed': 'مكتمل',
              'cancelled': 'ملغي',
            };

            toast({
              title: '🔔 تحديث حالة الطلب',
              description: `الطلب "${payload.new.title}" أصبح: ${statusMessages[newStatus] || newStatus}`,
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    channels.push(clientRequestsChannel);

    // الاستماع لتحديثات الطلبات (للعمال)
    const workerRequestsChannel = supabase
      .channel('worker-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_requests',
          filter: `worker_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('تحديث طلب (عامل):', payload);
          
          if (payload.eventType === 'INSERT') {
            toast({
              title: '🆕 طلب جديد',
              description: `تم تعيين طلب جديد لك: ${payload.new.title}`,
              duration: 5000,
            });
          } else if (payload.eventType === 'UPDATE') {
            const oldStatus = payload.old.status;
            const newStatus = payload.new.status;

            if (oldStatus !== newStatus) {
              const statusMessages: Record<string, string> = {
                'pending': 'قيد الانتظار',
                'accepted': 'تم القبول',
                'in_progress': 'قيد التنفيذ',
                'completed': 'مكتمل',
                'cancelled': 'ملغي',
              };

              toast({
                title: '🔔 تحديث حالة الطلب',
                description: `الطلب "${payload.new.title}" أصبح: ${statusMessages[newStatus] || newStatus}`,
                duration: 5000,
              });
            }
          }
        }
      )
      .subscribe();

    channels.push(workerRequestsChannel);

    // الاستماع للإشعارات
    const notificationsChannel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('إشعار جديد:', payload);
          
          toast({
            title: payload.new.title,
            description: payload.new.message,
            duration: 5000,
          });
        }
      )
      .subscribe();

    channels.push(notificationsChannel);

    // طلب إذن الإشعارات
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // تنظيف عند إلغاء التثبيت
    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [user, toast]);
};
