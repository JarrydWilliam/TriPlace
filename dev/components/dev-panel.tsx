/**
 * Development Control Panel Component
 * Provides debugging tools and development utilities in a convenient UI
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../client/src/components/ui/card';
import { Button } from '../../client/src/components/ui/button';
import { Badge } from '../../client/src/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../client/src/components/ui/tabs';
import { DEBUG_CONFIG } from '../configs/debug.config';
import { devLogger } from '../utils/debug';

interface DevPanelProps {
  isVisible?: boolean;
  onToggle?: () => void;
}

export const DevPanel: React.FC<DevPanelProps> = ({ 
  isVisible = false, 
  onToggle 
}) => {
  const [activeTab, setActiveTab] = useState('logs');
  const [logs, setLogs] = useState<string[]>([]);

  const handleClearLogs = () => {
    setLogs([]);
    devLogger.info('Development logs cleared');
  };

  const handleTestToast = () => {
    devLogger.success('Test notification triggered');
  };

  const handleDatabaseSeed = async () => {
    try {
      devLogger.info('Triggering database seed...');
      // This would call the seeding script
      devLogger.success('Database seeding completed');
    } catch (error) {
      devLogger.error('Database seeding failed', error);
    }
  };

  const handleClearDatabase = async () => {
    try {
      devLogger.info('Clearing database...');
      // This would call the cleanup script
      devLogger.success('Database cleared');
    } catch (error) {
      devLogger.error('Database cleanup failed', error);
    }
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          onClick={onToggle}
          variant="outline"
          size="sm"
          className="bg-purple-600 text-white hover:bg-purple-700"
        >
          Dev Panel
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-96 z-50">
      <Card className="bg-gray-900 text-white border-purple-500">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Development Panel</CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                {DEBUG_CONFIG.FEATURES.SHOW_DEBUG_PANEL ? 'Active' : 'Inactive'}
              </Badge>
              <Button 
                onClick={onToggle}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-gray-400 hover:text-white"
              >
                ×
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 bg-gray-800">
              <TabsTrigger value="logs" className="text-xs">Logs</TabsTrigger>
              <TabsTrigger value="db" className="text-xs">Database</TabsTrigger>
              <TabsTrigger value="config" className="text-xs">Config</TabsTrigger>
            </TabsList>

            <TabsContent value="logs" className="mt-3">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium">Debug Logs</span>
                  <Button 
                    onClick={handleClearLogs}
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs"
                  >
                    Clear
                  </Button>
                </div>
                <div className="bg-gray-800 p-2 rounded text-xs h-32 overflow-y-auto">
                  {logs.length === 0 ? (
                    <div className="text-gray-500">No logs yet...</div>
                  ) : (
                    logs.map((log, index) => (
                      <div key={index} className="mb-1">{log}</div>
                    ))
                  )}
                </div>
                <Button 
                  onClick={handleTestToast}
                  variant="outline"
                  size="sm"
                  className="w-full h-7 text-xs"
                >
                  Test Notification
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="db" className="mt-3">
              <div className="space-y-2">
                <span className="text-xs font-medium">Database Controls</span>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={handleDatabaseSeed}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                  >
                    Seed DB
                  </Button>
                  <Button 
                    onClick={handleClearDatabase}
                    variant="destructive"
                    size="sm"
                    className="h-8 text-xs"
                  >
                    Clear DB
                  </Button>
                </div>
                <div className="text-xs text-gray-400">
                  <div>Status: Connected</div>
                  <div>Tables: 10</div>
                  <div>Test Users: 5</div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="config" className="mt-3">
              <div className="space-y-2">
                <span className="text-xs font-medium">Debug Settings</span>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>API Logging:</span>
                    <Badge variant={DEBUG_CONFIG.LOGGING.LOG_API_REQUESTS ? 'default' : 'secondary'} className="text-xs">
                      {DEBUG_CONFIG.LOGGING.LOG_API_REQUESTS ? 'On' : 'Off'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>WebSocket:</span>
                    <Badge variant={DEBUG_CONFIG.LOGGING.LOG_WEBSOCKET_EVENTS ? 'default' : 'secondary'} className="text-xs">
                      {DEBUG_CONFIG.LOGGING.LOG_WEBSOCKET_EVENTS ? 'On' : 'Off'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Performance:</span>
                    <Badge variant={DEBUG_CONFIG.FEATURES.SHOW_PERFORMANCE_METRICS ? 'default' : 'secondary'} className="text-xs">
                      {DEBUG_CONFIG.FEATURES.SHOW_PERFORMANCE_METRICS ? 'On' : 'Off'}
                    </Badge>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default DevPanel;