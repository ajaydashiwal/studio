
"use client";

import { useState } from 'react';
import type { User } from '@/lib/data';
import { validateLogin } from '@/lib/data';
import LoginForm from '@/components/auth/login-form';
import DataDashboard from '@/components/dashboard/data-dashboard';
import { useToast } from "@/hooks/use-toast"

type LoggedInUser = Omit<User, 'membershipStatus'>;

export default function Home() {
  const [user, setUser] = useState<LoggedInUser | null>(null);
  const { toast } = useToast();

  const handleLogin = (flatNo: string, password: string) => {
    const loggedInUser = validateLogin(flatNo, password);
    if (loggedInUser) {
      setUser(loggedInUser);
      toast({
        title: "Login Successful",
        description: `Welcome, ${loggedInUser.ownerName}!`,
      })
    } else {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Invalid credentials. Please try again.",
      })
    }
  };

  const handleLogout = () => {
    setUser(null);
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    })
  };

  return (
    <div className="min-h-screen bg-background font-body">
        <div className="flex flex-col items-center justify-center p-4 md:p-8 min-h-screen">
            {user ? (
                <DataDashboard user={user} onLogout={handleLogout} />
            ) : (
                <LoginForm onLogin={handleLogin} />
            )}
        </div>
    </div>
  );
}
