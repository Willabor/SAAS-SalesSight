import { StatsOverview } from "@/components/stats-overview";
import { ExcelFormatter } from "@/components/excel-formatter";
import { UploadProgress } from "@/components/upload-progress";
import { RecentActivity } from "@/components/recent-activity";
import { AppHeader } from "@/components/app-header";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

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
