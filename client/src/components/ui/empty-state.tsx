import { Button } from "./button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
          {icon}
        </div>
        <CardTitle className="text-gray-900 dark:text-gray-100">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {action && (
        <CardContent>
          <Button onClick={action.onClick} className="w-full">
            {action.label}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

export function InlineEmptyState({ 
  icon, 
  title, 
  description, 
  className = "" 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  className?: string; 
}) {
  return (
    <div className={`text-center p-6 ${className}`}>
      <div className="mx-auto w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
      <p className="text-xs text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  );
}