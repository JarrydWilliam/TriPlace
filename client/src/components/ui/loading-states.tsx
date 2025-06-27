import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function CommunityCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center space-x-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <div className="flex space-x-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
    </Card>
  );
}

export function EventCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <div className="flex justify-between items-center">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </Card>
  );
}

export function MessageSkeleton() {
  return (
    <div className="flex space-x-3 p-3">
      <Skeleton className="w-8 h-8 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <Skeleton className="w-16 h-16 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </Card>
      
      <div className="grid grid-cols-2 gap-4">
        <CommunityCardSkeleton />
        <CommunityCardSkeleton />
      </div>
      
      <div className="space-y-3">
        <EventCardSkeleton />
        <EventCardSkeleton />
      </div>
    </div>
  );
}