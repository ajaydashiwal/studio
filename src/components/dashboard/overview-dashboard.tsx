
'use client';

import { useEffect, useState } from 'react';
import type { User } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import MaintenancePieChart from '@/components/charts/maintenance-pie-chart';
import FeedbackBarChart from '@/components/charts/feedback-bar-chart';

interface OverviewDashboardProps {
  user: Omit<User, 'membershipStatus'>;
}

interface ChartData {
  name: string;
  value: number;
  fill?: string;
}

interface MemberData {
  maintenance: ChartData[];
  feedback: ChartData[];
}

interface OfficeBearerData {
  financials: ChartData[];
  feedbackSummary: ChartData[];
}

type DashboardData = MemberData | OfficeBearerData;

export default function OverviewDashboard({ user }: OverviewDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({ userType: user.userType });
      if (user.userType === 'Member') {
        params.set('flatNo', user.flatNo);
      }

      try {
        const response = await fetch(`/api/dashboard?${params.toString()}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch dashboard data');
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const renderMemberDashboard = (memberData: MemberData) => (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Status (Last 24 Months)</CardTitle>
          <CardDescription>Overview of your paid vs. due maintenance fees.</CardDescription>
        </CardHeader>
        <CardContent>
          <MaintenancePieChart data={memberData.maintenance} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>My Feedback Status</CardTitle>
          <CardDescription>Summary of your submitted complaints and suggestions.</CardDescription>
        </CardHeader>
        <CardContent>
          {memberData.feedback && memberData.feedback.length > 0 ? (
            <FeedbackBarChart data={memberData.feedback} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              You have not submitted any feedback yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderOfficeBearerDashboard = (officeData: OfficeBearerData) => (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
            <CardTitle>Financials (Last 24 Months)</CardTitle>
            <CardDescription>
                Collections vs. Expenditure overview.
            </CardDescription>
        </CardHeader>
        <CardContent>
            {officeData.financials && officeData.financials.length > 0 ? (
                <MaintenancePieChart data={officeData.financials} />
            ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                    No financial data available.
                </div>
            )}
        </CardContent>
    </Card>
    <Card>
        <CardHeader>
            <CardTitle>Feedback Breakdown</CardTitle>
            <CardDescription>Total complaints vs. suggestions received.</CardDescription>
        </CardHeader>
        <CardContent>
            {officeData.feedbackSummary && officeData.feedbackSummary.length > 0 ? (
                 <MaintenancePieChart data={officeData.feedbackSummary} />
            ) : (
                 <div className="flex items-center justify-center h-full text-muted-foreground">
                    No feedback data available.
                </div>
            )}
        </CardContent>
    </Card>
    </div>
  );
  
  if (loading) {
    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                <CardContent><Skeleton className="h-[250px] w-full" /></CardContent>
            </Card>
            <Card>
                <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                <CardContent><Skeleton className="h-[250px] w-full" /></CardContent>
            </Card>
        </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Dashboard Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data) {
     return <p>No dashboard data available.</p>;
  }

  return (
    <div className="space-y-6">
        {user.userType === 'Member'
            ? renderMemberDashboard(data as MemberData)
            : renderOfficeBearerDashboard(data as OfficeBearerData)
        }
    </div>
  );
}
