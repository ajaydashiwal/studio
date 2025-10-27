
'use client';

import { useEffect, useState } from 'react';
import type { User } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import MaintenancePieChart from '@/components/charts/maintenance-pie-chart';
import FeedbackBarChart from '@/components/charts/feedback-bar-chart';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";


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
  financialSummary: ChartData[];
  feedbackSummary: ChartData[];
}

interface Complaint {
    id: string;
    submissionDate: string;
    formType: string;
    issueCategory: string;
    description: string;
    status: string;
}

type DashboardData = MemberData | OfficeBearerData;

const getStatusBadgeVariant = (status: string) => {
    switch (status) {
        case 'Open': return 'destructive';
        case 'In Progress': return 'secondary';
        case 'Resolved': return 'default';
        case 'Closed': return 'outline';
        default: return 'outline';
    }
};

const getStatusBadgeColor = (status: string) => {
     switch (status) {
        case 'Resolved': return 'bg-green-600';
        default: return '';
    }
}

export default function OverviewDashboard({ user }: OverviewDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allComplaints, setAllComplaints] = useState<Complaint[]>([]);
  const [complaintsLoading, setComplaintsLoading] = useState(true);

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

    const fetchAllComplaints = async () => {
        if(user.userType === 'Member') {
            setComplaintsLoading(false);
            return;
        };

        setComplaintsLoading(true);
        try {
            const response = await fetch('/api/complaints');
            if (!response.ok) throw new Error("Failed to fetch complaints.");
            const data = await response.json();
            setAllComplaints(data);
        } catch (err) {
             // setError can be used here if you want to show error for this part too
        } finally {
            setComplaintsLoading(false);
        }
    };

    fetchData();
    fetchAllComplaints();
  }, [user]);

  const renderMemberDashboard = (memberData: MemberData) => (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Status (Last 24 Months)</CardTitle>
          <CardDescription>Overview of your paid vs. due maintenance fees.</CardDescription>
        </CardHeader>
        <CardContent>
           {memberData.maintenance && memberData.maintenance.length > 0 ? (
            <MaintenancePieChart data={memberData.maintenance} />
          ) : (
             <div className="flex items-center justify-center h-full text-muted-foreground">
              No maintenance data to display.
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>My Feedback Status</CardTitle>
          <CardDescription>Summary of your submitted complaints and suggestions.</CardDescription>
        </CardHeader>
        <CardContent>
          {(memberData.feedback && memberData.feedback.length > 0) ? (
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
    <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Financial Summary</CardTitle>
                    <CardDescription>
                        Total collections vs. total expenditure.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {officeData.financialSummary && officeData.financialSummary.length > 0 ? (
                        <MaintenancePieChart data={officeData.financialSummary} />
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            No financial data available.
                        </div>
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Community Feedback Summary</CardTitle>
                    <CardDescription>An overview of all submitted feedback.</CardDescription>
                </CardHeader>
                <CardContent>
                     {officeData.feedbackSummary && officeData.feedbackSummary.length > 0 ? (
                        <FeedbackBarChart data={officeData.feedbackSummary} />
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            No feedback data available.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Community Feedback Status</CardTitle>
                <CardDescription>A live list of all recent complaints and suggestions.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-96 rounded-md border">
                    <Table>
                        <TableHeader className="sticky top-0 bg-secondary">
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Type/Category</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {complaintsLoading ? (
                                Array.from({ length: 5 }).map((_, index) => (
                                <TableRow key={`skeleton-${index}`}>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                    <TableCell className="text-center"><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                </TableRow>
                                ))
                            ) : allComplaints.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No feedback found.</TableCell></TableRow>
                            ) : (
                                allComplaints.slice(0, 20).map((item) => ( // Show recent 20
                                    <TableRow key={item.id}>
                                        <TableCell className="text-xs">{item.submissionDate}</TableCell>
                                        <TableCell className="font-medium">{item.formType === 'Complaint' ? item.issueCategory : 'Suggestion'}</TableCell>
                                        <TableCell className="text-sm max-w-xs truncate">{item.description}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={getStatusBadgeVariant(item.status)} className={getStatusBadgeColor(item.status)}>{item.status}</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
    </div>
  );
  
  if (loading) {
    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
            </Card>
            <Card>
                <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
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
