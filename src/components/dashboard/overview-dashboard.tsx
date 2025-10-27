
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";


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

const generateMonthYearOptions = () => {
    const options = [];
    const now = new Date();
    // Go back 36 months for the "From" dropdown
    for (let i = 0; i < 36; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const month = date.toLocaleString('default', { month: 'short' });
        const year = date.getFullYear();
        options.push({ value: `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`, label: `${month} ${year}` });
    }
    return options;
}

const monthYearOptions = generateMonthYearOptions();

export default function OverviewDashboard({ user }: OverviewDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allComplaints, setAllComplaints] = useState<Complaint[]>([]);
  const [complaintsLoading, setComplaintsLoading] = useState(true);
  const [period, setPeriod] = useState<{ from: string; to: string }>({ 
      from: monthYearOptions[11].value, // Default to 12 months ago
      to: monthYearOptions[0].value,   // Default to current month
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({ 
          userType: user.userType,
          from: period.from,
          to: period.to,
      });

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
    if (user.userType !== 'Member') {
      fetchAllComplaints();
    }
  }, [user, period]);

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
                   <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                        <div>
                            <CardTitle>Financial Summary</CardTitle>
                            <CardDescription>
                                Total collections vs. total expenditure.
                            </CardDescription>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <div className="grid gap-1.5">
                                <Label htmlFor="from-period" className="text-xs">From</Label>
                                <Select value={period.from} onValueChange={(value) => setPeriod(p => ({ ...p, from: value }))}>
                                    <SelectTrigger className="w-full sm:w-[140px] h-9" id="from-period">
                                        <SelectValue placeholder="Select Period" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {monthYearOptions.map(option => (
                                            <SelectItem key={`from-${option.value}`} value={option.value}>{option.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="grid gap-1.5">
                                <Label htmlFor="to-period" className="text-xs">To</Label>
                                <Select value={period.to} onValueChange={(value) => setPeriod(p => ({ ...p, to: value }))}>
                                    <SelectTrigger className="w-full sm:w-[140px] h-9" id="to-period">
                                        <SelectValue placeholder="Select Period" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {monthYearOptions.slice(0, 24).map(option => (
                                            <SelectItem key={`to-${option.value}`} value={option.value}>{option.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                   </div>
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
