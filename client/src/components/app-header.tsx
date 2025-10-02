import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { FileSpreadsheet, Package, Receipt, BarChart3, Truck, Target, LogOut, User, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function AppHeader() {
  const { user } = useAuth();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const getUserDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.email) {
      return user.email;
    }
    return "User";
  };

  return (
    <header className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-primary-foreground" />
            </div>
            <Link href="/">
              <span className="text-xl font-semibold text-foreground hover:text-foreground/80 transition-colors cursor-pointer">
                Excel Sales Data Processor
              </span>
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <nav className="flex items-center space-x-4">
              <Link href="/item-list">
                <button className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2" data-testid="link-item-list">
                  <Package className="w-5 h-5" />
                  <span className="hidden sm:inline">Item List</span>
                </button>
              </Link>
              <Link href="/sales-transactions">
                <button className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2" data-testid="link-sales-transactions">
                  <Receipt className="w-5 h-5" />
                  <span className="hidden sm:inline">Transactions</span>
                </button>
              </Link>
              <Link href="/sales-insights">
                <button className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2" data-testid="link-sales-insights">
                  <BarChart3 className="w-5 h-5" />
                  <span className="hidden sm:inline">Insights</span>
                </button>
              </Link>
              <Link href="/google-marketing">
                <button className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2" data-testid="link-google-marketing">
                  <Target className="w-5 h-5" />
                  <span className="hidden sm:inline">Marketing</span>
                </button>
              </Link>
              <Link href="/ml/training-history">
                <button className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2" data-testid="link-ml-logs">
                  <History className="w-5 h-5" />
                  <span className="hidden sm:inline">ML Logs</span>
                </button>
              </Link>
              <Link href="/receiving">
                <button className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2" data-testid="link-receiving-history">
                  <Truck className="w-5 h-5" />
                  <span className="hidden sm:inline">Receiving</span>
                </button>
              </Link>
            </nav>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full" data-testid="button-user-menu">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user?.profileImageUrl || undefined} alt={getUserDisplayName()} />
                    <AvatarFallback>{getUserInitials()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none" data-testid="text-user-name">{getUserDisplayName()}</p>
                    {user?.email && (
                      <p className="text-xs leading-none text-muted-foreground" data-testid="text-user-email">
                        {user.email}
                      </p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
