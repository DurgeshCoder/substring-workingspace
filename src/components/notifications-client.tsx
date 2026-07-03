'use client';

import React, { useState, useEffect } from 'react';
import { markAsRead, markAllAsRead } from '@/actions/notifications';
import { Bell, Check, CheckCheck, Clock, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface NotificationData {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

interface NotificationsClientProps {
  notifications: NotificationData[];
}

export default function NotificationsClient({ notifications }: NotificationsClientProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const router = useRouter();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const notificationsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [notifications.length]);

  const handleMarkAsRead = async (id: string) => {
    setIsLoading(id);
    try {
      const result = await markAsRead(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Marked as read');
        router.refresh();
      }
    } catch (err) {
      toast.error('Failed to update notification.');
    } finally {
      setIsLoading(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    setIsMarkingAll(true);
    try {
      const result = await markAllAsRead();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('All notifications marked as read!');
        router.refresh();
      }
    } catch (err) {
      toast.error('Failed to update notifications.');
    } finally {
      setIsMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="text-xs text-muted-foreground">
            Keep track of task allocations, updates, and updates across your workspace.
          </p>
        </div>
        {unreadCount > 0 && (
          <Button 
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAll}
            variant="outline"
            size="sm"
            className="border-border text-foreground hover:text-white rounded-xl flex items-center gap-1.5 cursor-pointer text-xs"
          >
            {isMarkingAll ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCheck className="w-4 h-4 text-indigo-400" />
            )}
            <span>Mark all as read</span>
          </Button>
        )}
      </div>

      {/* Notifications list */}
      {(() => {
        const totalItems = notifications.length;
        const totalPages = Math.ceil(totalItems / notificationsPerPage);
        const paginatedNotifications = notifications.slice(
          (currentPage - 1) * notificationsPerPage,
          currentPage * notificationsPerPage
        );

        return (
          <div className="space-y-4">
            <div className="space-y-4">
              {paginatedNotifications.map((n) => (
                <Card 
                  key={n.id}
                  className={`bg-card border-border hover:border-border transition-all duration-200 rounded-2xl shadow-sm ${
                    !n.isRead ? 'ring-1 ring-indigo-500/20 bg-gradient-to-r from-card via-card to-indigo-950/10' : ''
                  }`}
                >
                  <CardContent className="p-5 flex items-start gap-4 justify-between">
                    
                    <div className="flex items-start gap-3.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 ${
                        !n.isRead 
                          ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' 
                          : 'bg-background/60 border-border text-muted-foreground'
                      }`}>
                        <Bell className="w-4.5 h-4.5" />
                      </div>
                      
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={`text-xs font-bold leading-tight ${!n.isRead ? 'text-white' : 'text-foreground'}`}>
                            {n.title}
                          </h3>
                          {!n.isRead && (
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                          {n.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground flex items-center font-medium">
                          <Clock className="w-3.5 h-3.5 mr-1" />
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>

                    {!n.isRead && (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        disabled={isLoading === n.id}
                        onClick={() => handleMarkAsRead(n.id)}
                        className="text-muted-foreground hover:text-indigo-400 hover:bg-muted/40 rounded-lg cursor-pointer shrink-0"
                      >
                        {isLoading === n.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </Button>
                    )}

                  </CardContent>
                </Card>
              ))}

              {notifications.length === 0 && (
                <div className="bg-card/50 border border-dashed border-border rounded-2xl p-16 text-center text-muted-foreground space-y-3 shadow-md">
                  <Bell className="w-10 h-10 text-muted-foreground mx-auto animate-pulse" />
                  <p className="text-sm font-semibold">You're all caught up!</p>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    No new alerts or task notifications at this time.
                  </p>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card border border-border rounded-2xl p-4 shadow-sm">
                <div className="text-xs text-muted-foreground font-medium">
                  Showing <span className="font-semibold text-white">{(currentPage - 1) * notificationsPerPage + 1}</span> to{' '}
                  <span className="font-semibold text-white">
                    {Math.min(currentPage * notificationsPerPage, totalItems)}
                  </span>{' '}
                  of <span className="font-semibold text-white">{totalItems}</span> alerts
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-8 h-8 rounded-lg border-border hover:bg-muted cursor-pointer"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      Math.abs(page - currentPage) <= 1
                    ) {
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? 'default' : 'outline'}
                          size="sm"
                          className={cn(
                            'w-8 h-8 rounded-lg text-xs font-semibold cursor-pointer',
                            currentPage === page
                              ? 'bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-650 hover:to-fuchsia-650 text-white border-0 shadow-md'
                              : 'border-border hover:bg-muted'
                          )}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      );
                    }
                    if (
                      (page === 2 && currentPage > 3) ||
                      (page === totalPages - 1 && currentPage < totalPages - 2)
                    ) {
                      return (
                        <span key={page} className="px-1 text-xs text-muted-foreground select-none">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}

                  <Button
                    variant="outline"
                    size="icon"
                    className="w-8 h-8 rounded-lg border-border hover:bg-muted cursor-pointer"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

    </div>
  );
}
