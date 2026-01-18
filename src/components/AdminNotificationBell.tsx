import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, FileText, ClipboardList, Users, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';

export const AdminNotificationBell = () => {
  const navigate = useNavigate();
  const { 
    pendingDocuments, 
    pendingRequests, 
    newUsers, 
    totalAlerts, 
    loading 
  } = useAdminNotifications();
  const [isOpen, setIsOpen] = useState(false);

  if (loading) {
    return (
      <Button variant="ghost" size="sm" className="relative" disabled>
        <Bell className="w-5 h-5" />
      </Button>
    );
  }

  const handleNavigate = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-5 h-5" />
          {totalAlerts > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs animate-pulse"
            >
              {totalAlerts > 9 ? '9+' : totalAlerts}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-bold text-lg">تنبيهات المدير</h3>
          {totalAlerts > 0 && (
            <Badge variant="secondary">
              {totalAlerts} تنبيه
            </Badge>
          )}
        </div>

        {totalAlerts === 0 && newUsers === 0 ? (
          <div className="px-4 py-8 text-center text-muted-foreground">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>لا توجد تنبيهات حالياً</p>
          </div>
        ) : (
          <>
            {pendingDocuments > 0 && (
              <DropdownMenuItem
                className="flex items-start gap-3 p-4 cursor-pointer hover:bg-destructive/10"
                onClick={() => handleNavigate('/admin')}
              >
                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-orange-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">وثائق معلقة</p>
                    <Badge variant="destructive" className="text-xs">
                      {pendingDocuments}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {pendingDocuments} وثيقة بانتظار الموافقة
                  </p>
                </div>
              </DropdownMenuItem>
            )}

            {pendingRequests > 0 && (
              <DropdownMenuItem
                className="flex items-start gap-3 p-4 cursor-pointer hover:bg-primary/10"
                onClick={() => handleNavigate('/admin')}
              >
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <ClipboardList className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">طلبات معلقة</p>
                    <Badge variant="secondary" className="text-xs">
                      {pendingRequests}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {pendingRequests} طلب خدمة بانتظار المراجعة
                  </p>
                </div>
              </DropdownMenuItem>
            )}

            {newUsers > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="flex items-start gap-3 p-4 cursor-pointer hover:bg-green-500/10"
                  onClick={() => handleNavigate('/admin')}
                >
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">مستخدمين جدد</p>
                      <Badge variant="outline" className="text-xs text-green-600">
                        +{newUsers}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      انضم {newUsers} مستخدم جديد خلال 24 ساعة
                    </p>
                  </div>
                </DropdownMenuItem>
              </>
            )}
          </>
        )}

        <DropdownMenuSeparator />
        
        <div className="p-2 flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => handleNavigate('/admin')}
          >
            لوحة التحكم
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            className="flex-1"
            onClick={() => handleNavigate('/admin/stats')}
          >
            الإحصائيات
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
