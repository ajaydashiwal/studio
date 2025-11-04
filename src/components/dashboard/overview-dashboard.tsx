
'use client';

import { useEffect, useState } from 'react';
import type { User } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Megaphone } from 'lucide-react';
import MaintenancePieChart from '@/components/charts/maintenance-pie-chart';
import FeedbackBarChart from '@/components/charts/feedback-bar-chart';
import NotificationDisplay from '@/components/dashboard/notification-display';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableFooter,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { subMonths, addMonths, format, startOfMonth, parse, differenceInDays } from 'date-fns';

interface OverviewDashboardProps {
  user: Omit<User, 'membershipStatus'>;
}

interface ChartData {
  name: string;
  value: number;
  fill?: string;
}

interface ExpenditureReportSection {
    type: string;
    total: number;
}

interface MemberData {
  maintenance: ChartData[];
  feedback: ChartData[];
  expenditure: ExpenditureReportSection[];
}

interface OfficeBearerData {
  financialSummary: ChartData[];
  feedbackSummary: ChartData[];
}

interface Complaint {
    id: string;
    submissionDate: string;
    flatNo: string;
    formType: string;
    issueCategory: string;
    description: string;
    status: string;
    remarks: string;
}

type DashboardData = MemberData | OfficeBearerData;

const getStatusBadgeVariant = (status: string): "default" | "destructive" | "secondary" | "outline" => {
    switch (status) {
        case 'Open': return 'destructive';
        case 'In Progress': return 'secondary';
        case 'Resolved': return 'default';
        case 'Closed': return 'destructive';
        default: return 'outline';
    }
};

const getStatusBadgeClass = (status: string) => {
     switch (status) {
        case 'Resolved': return 'bg-green-600 hover:bg-green-700';
        case 'Closed': return 'bg-red-800 hover:bg-red-900';
        case 'In Progress': return 'bg-yellow-400 text-yellow-900 hover:bg-yellow-500';
        default: return '';
    }
}

const calculatePendingDays = (submissionDate: string): number => {
    if (!submissionDate) return 0;
    try {
        const date = parse(submissionDate, "dd/MM/yyyy HH:mm:ss", new Date());
        if (isNaN(date.getTime())) return 0;
        return differenceInDays(new Date(), date);
    } catch {
        return 0;
    }
};


const now = startOfMonth(new Date());

const fromDateOptions = (() => {
    const options = [];
    const startDate = new Date(2015, 9, 1); // October 2015
    let currentDate = now;
    while (currentDate >= startDate) {
        options.push({
            value: format(currentDate, 'yyyy-MM'),
            label: format(currentDate, 'MMM yyyy')
        });
        currentDate = subMonths(currentDate, 1);
    }
    return options;
})();

const toDateOptions = (() => {
    const options = [];
    const startDate = new Date(2015, 9, 1); // October 2015
    const futureLimit = addMonths(now, 12);
    let currentDate = futureLimit;
    while (currentDate >= startDate) {
        options.push({
            value: format(currentDate, 'yyyy-MM'),
            label: format(currentDate, 'MMM yyyy')
        });
        currentDate = subMonths(currentDate, 1);
    }
    return options;
})();


export default function OverviewDashboard({ user }: OverviewDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allComplaints, setAllComplaints] = useState<Complaint[]>([]);
  const [userActionedFeedback, setUserActionedFeedback] = useState<Complaint[]>([]);
  const [complaintsLoading, setComplaintsLoading] = useState(true);
  
  const defaultFrom = subMonths(now, 11);
  
  const [period, setPeriod] = useState<{ from: string; to: string }>({ 
      from: format(defaultFrom, 'yyyy-MM'),
      to: format(now, 'yyyy-MM'),
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
        setComplaintsLoading(true);
        try {
            const response = await fetch('/api/complaints');
            if (!response.ok) throw new Error("Failed to fetch complaints.");
            const data = await response.json();

            const sortedData = data.sort((a: Complaint, b: Complaint) => {
                const aIsPending = a.status === 'Open';
                const bIsPending = b.status === 'Open';

                if (aIsPending && !bIsPending) return -1;
                if (!aIsPending && bIsPending) return 1;

                if (aIsPending && bIsPending) {
                    return calculatePendingDays(b.submissionDate) - calculatePendingDays(a.submissionDate);
                }
                
                try {
                    const dateA = parse(a.submissionDate, "dd/MM/yyyy HH:mm:ss", new Date());
                    const dateB = parse(b.submissionDate, "dd/MM/yyyy HH:mm:ss", new Date());
                    if (isNaN(dateA.getTime())) return 1;
                    if (isNaN(dateB.getTime())) return -1;
                    return dateB.getTime() - dateA.getTime();
                } catch {
                    return 0; 
                }
            });

            setAllComplaints(sortedData.slice(0, 10));

            if (user.userType === 'Member') {
                const actioned = data.filter((c: Complaint) => 
                    c.flatNo === user.flatNo && c.status !== 'Open'
                );
                setUserActionedFeedback(actioned);
            }

        } catch (err) {
             // setError can be used here if you want to show error for this part too
        } finally {
            setComplaintsLoading(false);
        }
    };

    fetchData();
    fetchAllComplaints();
  }, [user, period]);

  const renderMemberDashboard = (memberData: MemberData) => {
    const feedbackChartData: ChartData[] = memberData.feedback ? memberData.feedback.map(item => ({ name: item.name, value: item.value })) : [];
    const expenditureData = memberData.expenditure || [];
    const grandTotalExpenditure = expenditureData.reduce((acc, item) => acc + item.total, 0);

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card className="h-full flex flex-col">
                <CardHeader>
                <CardTitle>Maintenance Status (Last 24 Months)</CardTitle>
                <CardDescription>Overview of your paid vs. due maintenance fees.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center">
                {memberData.maintenance && memberData.maintenance.length > 0 && memberData.maintenance.some(d => d.value > 0) ? (
                    <MaintenancePieChart data={memberData.maintenance} />
                ) : (
                    <div className="text-muted-foreground">
                    No maintenance data to display.
                    </div>
                )}
                </CardContent>
            </Card>
            <Card className="h-full flex flex-col">
                <CardHeader>
                <CardTitle>My Feedback Status</CardTitle>
                <CardDescription>Summary of your submitted complaints and suggestions.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center">
                {(feedbackChartData && feedbackChartData.length > 0) ? (
                    <FeedbackBarChart data={feedbackChartData.map(d => ({ ...d, fill: 'hsl(var(--chart-1))' }))} />
                ) : (
                    <div className="text-muted-foreground">
                    You have not submitted any feedback yet.
                    </div>
                )}
                </CardContent>
            </Card>
             <Card className="md:col-span-2">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                        <div>
                            <CardTitle>Expenditure Summary</CardTitle>
                            <CardDescription>
                                Category-wise RWA expenditure for the selected period.
                            </CardDescription>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <div className="grid gap-1.5">
                                <Label htmlFor="exp-from-period" className="text-xs">From</Label>
                                <Select value={period.from} onValueChange={(value) => setPeriod(p => ({ ...p, from: value }))}>
                                    <SelectTrigger className="w-full sm:w-[140px] h-9" id="exp-from-period">
                                        <SelectValue placeholder="Select Period" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {fromDateOptions.map(option => (
                                            <SelectItem key={`exp-from-${option.value}`} value={option.value} disabled={option.value > period.to}>{option.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="exp-to-period" className="text-xs">To</Label>
                                <Select value={period.to} onValueChange={(value) => setPeriod(p => ({ ...p, to: value }))}>
                                    <SelectTrigger className="w-full sm:w-[140px] h-9" id="exp-to-period">
                                        <SelectValue placeholder="Select Period" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {toDateOptions.map(option => (
                                            <SelectItem key={`exp-to-${option.value}`} value={option.value} disabled={option.value < period.from}>{option.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {expenditureData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center text-muted-foreground h-24">
                                        No expenditure data for this period.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                expenditureData.map((item) => (
                                    <TableRow key={item.type}>
                                        <TableCell className="font-medium">{item.type}</TableCell>
                                        <TableCell className="text-right">₹{item.total.toLocaleString()}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell className="font-bold">Grand Total</TableCell>
                                <TableCell className="text-right font-bold">₹{grandTotalExpenditure.toLocaleString()}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
  };

  const renderOfficeBearerDashboard = (officeData: OfficeBearerData) => {
    const financialChartData = officeData.financialSummary || [];
    const feedbackChartData = officeData.feedbackSummary || [];
    
    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <Card className="h-full flex flex-col">
                <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                        <div>
                            <CardTitle>Financial Summary</CardTitle>
                            <CardDescription>
                                Collections vs. total expenditure for the period.
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
                                        {fromDateOptions.map(option => (
                                            <SelectItem key={`from-${option.value}`} value={option.value} disabled={option.value > period.to}>{option.label}</SelectItem>
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
                                        {toDateOptions.map(option => (
                                            <SelectItem key={`to-${option.value}`} value={option.value} disabled={option.value < period.from}>{option.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                </div>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center">
                    {financialChartData.some(d => d.value > 0) ? (
                        <MaintenancePieChart data={financialChartData} />
                    ) : (
                        <div className="text-muted-foreground">
                            No financial data for the selected period.
                        </div>
                    )}
                </CardContent>
            </Card>
            <Card className="h-full flex flex-col">
                <CardHeader>
                    <CardTitle>Complaint/Feedback Breakdown</CardTitle>
                    <CardDescription>Total complaints vs. Suggestions for the period.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center">
                    {feedbackChartData.some(d => d.value > 0) ? (
                        <MaintenancePieChart data={feedbackChartData} />
                    ) : (
                        <div className="text-muted-foreground">
                            No feedback data for the selected period.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
  };

  const renderCommunityFeedback = () => (
    <Card>
        <CardHeader>
            <CardTitle>Residents Complaints/Suggestion Status</CardTitle>
            <CardDescription>A live list of the top 10 most urgent open complaints and other recent feedback.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="relative w-full overflow-auto">
                <Table className="min-w-full">
                    <TableHeader className="sticky top-0 bg-secondary z-20">
                        <TableRow>
                            <TableHead className="sticky left-0 bg-secondary z-30 min-w-[150px]">Type/Category</TableHead>
                            <TableHead className="min-w-[300px]">Description</TableHead>
                            <TableHead className="text-center min-w-[120px]">Status</TableHead>
                            <TableHead className="min-w-[150px]">Pending Since</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {complaintsLoading ? (
                            Array.from({ length: 5 }).map((_, index) => (
                            <TableRow key={`skeleton-${index}`}>
                                <TableCell className="sticky left-0 bg-background z-10"><Skeleton className="h-4 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                <TableCell className="text-center"><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            </TableRow>
                            ))
                        ) : allComplaints.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No feedback found.</TableCell></TableRow>
                        ) : (
                            allComplaints.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium sticky left-0 bg-background z-10">{item.formType === 'Complaint' ? item.issueCategory : 'Suggestion'}</TableCell>
                                    <TableCell className="text-sm whitespace-normal">{item.description}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={getStatusBadgeVariant(item.status)} className={getStatusBadgeClass(item.status)}>{item.status}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        {item.status === 'Open' ? `${calculatePendingDays(item.submissionDate)} days` : '-'}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
    </Card>
  );
  
  const renderRwaRemarks = () => (
     <Card>
        <CardHeader>
            <CardTitle>RWA Remarks on Your Feedback</CardTitle>
            <CardDescription>Actions taken and remarks on your submitted feedback.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="relative w-full overflow-auto">
                <Table className="min-w-full">
                     <TableHeader className="sticky top-0 bg-secondary z-20">
                        <TableRow>
                            <TableHead className="min-w-[150px]">Submitted</TableHead>
                            <TableHead className="min-w-[250px]">Your Feedback</TableHead>
                            <TableHead className="text-center min-w-[120px]">Final Status</TableHead>
                            <TableHead className="min-w-[250px]">RWA Remarks</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {complaintsLoading ? (
                             Array.from({ length: 2 }).map((_, index) => (
                            <TableRow key={`skeleton-remarks-${index}`}>
                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                <TableCell className="text-center"><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                            </TableRow>
                            ))
                        ) : userActionedFeedback.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No remarks on actioned feedback yet.</TableCell></TableRow>
                        ) : (
                            userActionedFeedback.map((item) => (
                                <TableRow key={`remark-${item.id}`}>
                                    <TableCell className="text-sm">{item.submissionDate}</TableCell>
                                    <TableCell className="text-sm whitespace-normal">{item.description}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={getStatusBadgeVariant(item.status)} className={getStatusBadgeClass(item.status)}>{item.status}</Badge>
                                    </TableCell>
                                    <TableCell className="text-sm whitespace-normal">{item.remarks || '-'}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
     </Card>
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
        <NotificationDisplay />

        {user.userType === 'Member'
            ? renderMemberDashboard(data as MemberData)
            : renderOfficeBearerDashboard(data as OfficeBearerData)
        }
        <div className="mt-6">
            {renderCommunityFeedback()}
        </div>
         {user.userType === 'Member' && (
             <div className="mt-6">
                {renderRwaRemarks()}
            </div>
         )}
    </div>
  );
}
