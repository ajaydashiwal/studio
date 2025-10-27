
'use client';

import { useEffect, useState } from 'react';
import type { User } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import MaintenancePieChart from '@/components/charts/maintenance-pie-chart';
import FeedbackBarChart from '@/components/charts/feedback-bar-chart';
import { HandCoins, MessageSquareWarning } from 'lucide-react';

interface OverviewDashboardProps {
  user: Omit<User, 'membershipStatus'>;
}

interface MemberData {
  maintenance: { name: string; value: number; fill: string }[];
  feedback: { name: string; value: number }[];
}

interface OfficeBearerData {
  collections: number;
  expenditure: number;
  financialSummary: { name: string; value: number }[];
  openFeedback: number;
  feedback: { name: string; value: number }[];
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
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-2">
              <CardHeader>
                  <CardTitle>Financial Summary</CardTitle>
                  <CardDescription>
                      Comparison of total collections vs. total expenditure.
                  </CardDescription>
              </CardHeader>
              <CardContent>
                  {officeData.financialSummary && officeData.financialSummary.length > 0 ? (
                      <FeedbackBarChart data={officeData.financialSummary} />
                  ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                          No financial data available.
                      </div>
                  )}
              </CardContent>
          </Card>
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Open Feedback</CardTitle>
                  <MessageSquareWarning className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{officeData.openFeedback}</div>
                  <p className="text-xs text-muted-foreground">New feedback items requiring action.</p>
              </CardContent>
          </Card>
      </div>
      <Card>
          <CardHeader>
              <CardTitle>Overall Feedback Status</CardTitle>
              <CardDescription>Summary of all submitted complaints and suggestions.</CardDescription>
          </CardHeader>
          <CardContent>
              {officeData.feedback && officeData.feedback.length > 0 ? (
                  <FeedbackBarChart data={officeData.feedback} />
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
