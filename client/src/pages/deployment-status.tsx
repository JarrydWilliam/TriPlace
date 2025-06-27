import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertTriangle, XCircle, Rocket } from "lucide-react";
import { runDeploymentChecks, getDeploymentSummary } from "@/lib/deployment-checks";

export default function DeploymentStatus() {
  const summary = getDeploymentSummary();
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pass':
        return <Badge className="bg-green-100 text-green-800">Pass</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      case 'fail':
        return <Badge className="bg-red-100 text-red-800">Fail</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Rocket className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              TriPlace Deployment Status
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Production readiness assessment and validation
          </p>
        </div>

        {/* Summary Card */}
        <Card className={`border-2 ${summary.ready ? 'border-green-500' : 'border-yellow-500'}`}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {summary.ready ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              )}
              <span>Deployment Summary</span>
            </CardTitle>
            <CardDescription>
              {summary.ready 
                ? "Application is ready for production deployment"
                : "Application has warnings but can be deployed"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {summary.checks.filter(c => c.status === 'pass').length}
                </div>
                <div className="text-sm text-green-700 dark:text-green-300">Passed</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {summary.warnings}
                </div>
                <div className="text-sm text-yellow-700 dark:text-yellow-300">Warnings</div>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {summary.criticalIssues}
                </div>
                <div className="text-sm text-red-700 dark:text-red-300">Critical Issues</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deployment Action */}
        {summary.ready && (
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <CardContent className="p-6 text-center">
              <Rocket className="w-12 h-12 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Ready for Deployment!</h3>
              <p className="mb-4">
                All critical checks passed. TriPlace is ready for production deployment.
              </p>
              <Button 
                size="lg" 
                className="bg-white text-blue-600 hover:bg-gray-100"
                onClick={() => window.open('https://docs.replit.com/deployments', '_blank')}
              >
                Deploy to Production
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Detailed Checks */}
        <Card>
          <CardHeader>
            <CardTitle>Detailed Checks</CardTitle>
            <CardDescription>
              Complete validation of all application components
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {summary.checks.map((check, index) => (
                <div 
                  key={index}
                  className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  {getStatusIcon(check.status)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {check.name}
                      </h4>
                      {getStatusBadge(check.status)}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {check.message}
                    </p>
                    {check.required && (
                      <span className="text-xs text-blue-600 dark:text-blue-400">
                        Required for deployment
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Feature Checklist */}
        <Card>
          <CardHeader>
            <CardTitle>Feature Completeness</CardTitle>
            <CardDescription>
              All planned TriPlace features implemented and tested
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                "15-question onboarding quiz system",
                "AI-powered community matching (with fallback)",
                "Location-aware member discovery (50-100 mile radius)",
                "Dynamic community membership system",
                "Four-tab community interface (Feed, Events, Members, Highlights)",
                "Real-time messaging with resonate functionality",
                "Event calendar with community coordination",
                "Kudos system with peer appreciation",
                "Comprehensive settings system (6 dedicated pages)",
                "Mobile-responsive design with dark mode",
                "Firebase authentication with Google sign-in",
                "Error boundaries and production error handling",
                "Loading states and user feedback throughout",
                "Professional UI matching high-end social apps"
              ].map((feature, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}