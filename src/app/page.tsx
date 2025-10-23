
"use client";

import { useState } from 'react';
import type { User } from '@/lib/data';
import LoginForm from '@/components/auth/login-form';
import DataDashboard from '@/components/dashboard/data-dashboard';
import { useToast } from "@/hooks/use-toast"

type LoggedInUser = Omit<User, 'membershipStatus'>;

export default function Home() {
  const [user, setUser] = useState<LoggedInUser | null>(null);
  const { toast } = useToast();

  const handleLogin = async (flatNo: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flatNo, password }),
      });

      if (response.ok) {
        const loggedInUser = await response.json();
        setUser(loggedInUser);
        toast({
          title: "Login Successful",
          description: `Welcome, ${loggedInUser.ownerName}!`,
        });
      } else {
        const { error } = await response.json();
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: error || "Invalid credentials. Please try again.",
        });
      }
    } catch (error) {
       toast({
          variant: "destructive",
          title: "Error",
          description: "Could not connect to the server.",
        });
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
