import { StatsOverview } from "@/components/stats-overview";
import { ExcelFormatter } from "@/components/excel-formatter";
import { UploadProgress } from "@/components/upload-progress";
import { RecentActivity } from "@/components/recent-activity";
import { HelpCircle, Settings, FileSpreadsheet, Package } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">Excel Sales Data Processor</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/item-list">
                <button className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2" data-testid="link-item-list">
                  <Package className="w-5 h-5" />
                  <span className="hidden sm:inline">Item List</span>
                </button>
              </Link>
              <button className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-help">
                <HelpCircle className="w-5 h-5" />
              </button>
              <button className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-settings">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-foreground mb-6">Dashboard Overview</h2>
          <StatsOverview />
        </section>

        {/* File Upload */}
        <section className="mb-8">
          <ExcelFormatter />
        </section>

        {/* Upload Progress */}
        <section className="mb-8">
          <UploadProgress />
        </section>

        {/* Recent Activity */}
        <section>
          <RecentActivity />
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">© 2024 Excel Sales Data Processor. All rights reserved.</p>
            <div className="flex items-center space-x-4">
              <button className="text-sm text-muted-foreground hover:text-foreground" data-testid="link-documentation">Documentation</button>
              <button className="text-sm text-muted-foreground hover:text-foreground" data-testid="link-support">Support</button>
              <button className="text-sm text-muted-foreground hover:text-foreground" data-testid="link-api">API</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
