import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import ItemListPage from "@/pages/item-list";
import SalesTransactionsPage from "@/pages/sales-transactions";
import SalesInsightsPage from "@/pages/sales-insights";
import ReceivingHistoryPage from "@/pages/receiving-history";
import VoucherViewerPage from "@/pages/voucher-viewer";
import GoogleMarketingPage from "@/pages/google-marketing";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/item-list" component={ItemListPage} />
          <Route path="/sales-transactions" component={SalesTransactionsPage} />
          <Route path="/sales-insights" component={SalesInsightsPage} />
          <Route path="/google-marketing" component={GoogleMarketingPage} />
          <Route path="/receiving" component={ReceivingHistoryPage} />
          <Route path="/receiving/viewer" component={VoucherViewerPage} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <SonnerToaster position="top-right" richColors />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
