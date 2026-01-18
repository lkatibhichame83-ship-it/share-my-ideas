import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface AdminAlert {
  id: string;
  type: 'document' | 'request' | 'user';
  title: string;
  message: string;
  link?: string;
  created_at: string;
  data?: Record<string, unknown>;
}

export const useAdminNotifications = () => {
  const { user } = useAuth();
  const { isAdmin } = useAdminCheck();
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [pendingDocuments, setPendingDocuments] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [newUsers, setNewUsers] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchPendingCounts = useCallback(async () => {
    if (!user || !isAdmin) return;

    try {
      // Count pending documents
      const { count: docsCount } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Count pending requests
      const { count: requestsCount } = await supabase
        .from('service_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Count new users in last 24 hours
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterday.toISOString());

      setPendingDocuments(docsCount || 0);
      setPendingRequests(requestsCount || 0);
      setNewUsers(usersCount || 0);

      // Build alerts list
      const newAlerts: AdminAlert[] = [];

      if (docsCount && docsCount > 0) {
        newAlerts.push({
          id: 'pending-docs',
          type: 'document',
          title: 'وثائق معلقة',
          message: `يوجد ${docsCount} وثيقة بانتظار الموافقة`,
          link: '/admin',
          created_at: new Date().toISOString(),
        });
      }

      if (requestsCount && requestsCount > 0) {
        newAlerts.push({
          id: 'pending-requests',
          type: 'request',
          title: 'طلبات معلقة',
          message: `يوجد ${requestsCount} طلب خدمة بانتظار المراجعة`,
          link: '/admin',
          created_at: new Date().toISOString(),
        });
      }

      if (usersCount && usersCount > 0) {
        newAlerts.push({
          id: 'new-users',
          type: 'user',
          title: 'مستخدمين جدد',
          message: `انضم ${usersCount} مستخدم جديد خلال 24 ساعة`,
          link: '/admin',
          created_at: new Date().toISOString(),
        });
      }

      setAlerts(newAlerts);
    } catch (error) {
      console.error('Error fetching admin counts:', error);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (!user || !isAdmin) {
      setLoading(false);
      return;
    }

    fetchPendingCounts();

    const channels: RealtimeChannel[] = [];

    // Listen for new documents
    const docsChannel = supabase
      .channel('admin-documents')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'documents',
        },
        async (payload) => {
          console.log('New document uploaded:', payload);
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', payload.new.user_id)
            .single();

          toast({
            title: '📄 وثيقة جديدة',
            description: `قام ${profile?.full_name || 'مستخدم'} برفع وثيقة ${payload.new.document_type}`,
            duration: 5000,
          });

          fetchPendingCounts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'documents',
        },
        () => {
          fetchPendingCounts();
        }
      )
      .subscribe();

    channels.push(docsChannel);

    // Listen for new service requests
    const requestsChannel = supabase
      .channel('admin-requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'service_requests',
        },
        async (payload) => {
          console.log('New service request:', payload);
          
          const { data: client } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', payload.new.client_id)
            .single();

          toast({
            title: '📋 طلب خدمة جديد',
            description: `${client?.full_name || 'عميل'} طلب: ${payload.new.title}`,
            duration: 5000,
          });

          fetchPendingCounts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'service_requests',
        },
        () => {
          fetchPendingCounts();
        }
      )
      .subscribe();

    channels.push(requestsChannel);

    // Listen for new users
    const usersChannel = supabase
      .channel('admin-users')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          console.log('New user registered:', payload);
          
          const accountType = payload.new.account_type === 'worker' ? 'عامل' : 'عميل';
          
          toast({
            title: '👤 مستخدم جديد',
            description: `انضم ${payload.new.full_name} كـ${accountType}`,
            duration: 5000,
          });

          fetchPendingCounts();
        }
      )
      .subscribe();

    channels.push(usersChannel);

    // Listen for new payments
    const paymentsChannel = supabase
      .channel('admin-payments')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'payments',
        },
        (payload) => {
          console.log('New payment:', payload);
          
          toast({
            title: '💰 دفعة جديدة',
            description: `تم إنشاء دفعة بقيمة $${payload.new.amount}`,
            duration: 5000,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments',
        },
        (payload) => {
          if (payload.new.status === 'completed' && payload.old.status !== 'completed') {
            toast({
              title: '✅ دفعة مكتملة',
              description: `تم استلام دفعة بقيمة $${payload.new.amount}`,
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    channels.push(paymentsChannel);

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [user, isAdmin, toast, fetchPendingCounts]);

  const totalAlerts = pendingDocuments + pendingRequests;

  return {
    alerts,
    pendingDocuments,
    pendingRequests,
    newUsers,
    totalAlerts,
    loading,
    refresh: fetchPendingCounts,
  };
};
