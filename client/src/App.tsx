import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import ItemListPage from "@/pages/item-list";
import SalesTransactionsPage from "@/pages/sales-transactions";
import SalesInsightsPage from "@/pages/sales-insights";
import ReceivingHistoryPage from "@/pages/receiving-history";
import VoucherViewerPage from "@/pages/voucher-viewer";
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
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
