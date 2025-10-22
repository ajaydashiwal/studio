import type { User } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { LogOut, UserCircle } from 'lucide-react';
import { Separator } from '../ui/separator';

interface AppHeaderProps {
  user: User;
  onLogout: () => void;
}

export default function AppHeader({ user, onLogout }: AppHeaderProps) {
  return (
    <header className="w-full bg-card p-4 rounded-lg shadow-md border">
        <div className="flex flex-col sm:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-4 sm:mb-0">
                <UserCircle className="h-8 w-8 text-primary" />
                <div>
                    <h1 className="text-lg font-bold text-foreground font-headline tracking-tight">
                        {user.ownerName}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Flat No: <span className="font-semibold">{user.flatNo}</span>
                    </p>
                </div>
            </div>
            <Button
                variant="outline"
                size="sm"
                onClick={onLogout}
            >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
            </Button>
        </div>
    </header>
  );
}
