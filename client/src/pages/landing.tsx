import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, TrendingUp, FileSpreadsheet, BarChart3 } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 text-slate-900 dark:text-slate-50">
            Excel Sales Data Processor
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
            Transform your sales data into actionable insights with powerful analytics and inventory management
          </p>
          <Button 
            onClick={handleLogin}
            size="lg"
            className="text-lg px-8"
            data-testid="button-login"
          >
            Sign In to Get Started
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16">
          <Card data-testid="card-feature-item-list">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Item List Management
              </CardTitle>
              <CardDescription>
                Upload and manage your complete product inventory with detailed item information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li>• Track inventory levels across multiple locations</li>
                <li>• Monitor stock availability in real-time</li>
                <li>• Update product information easily</li>
              </ul>
            </CardContent>
          </Card>

          <Card data-testid="card-feature-sales">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Sales Transaction Processing
              </CardTitle>
              <CardDescription>
                Process sales data with automatic duplicate detection and validation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li>• Import sales transactions from Excel</li>
                <li>• Automatic duplicate receipt detection</li>
                <li>• Comprehensive sales analytics</li>
              </ul>
            </CardContent>
          </Card>

          <Card data-testid="card-feature-receiving">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Receiving History
              </CardTitle>
              <CardDescription>
                Process QuickBooks receiving vouchers with intelligent data parsing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li>• Multi-step processing workflow</li>
                <li>• Automatic QuickBooks error correction</li>
                <li>• Search and filter vouchers easily</li>
              </ul>
            </CardContent>
          </Card>

          <Card data-testid="card-feature-analytics">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Advanced Analytics
              </CardTitle>
              <CardDescription>
                Gain insights with comprehensive sales and inventory analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li>• Inventory turnover metrics</li>
                <li>• Dead stock identification</li>
                <li>• Category-level performance analysis</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-sm text-slate-500 dark:text-slate-500">
          <p>Secure authentication powered by your account</p>
        </div>
      </div>
    </div>
  );
}
