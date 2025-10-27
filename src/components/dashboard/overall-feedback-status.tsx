
"use client"

import { useState, useEffect } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface Complaint {
    id: string;
    submissionDate: string;
    formType: string;
    issueCategory: string;
    description: string;
    status: string;
}

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

export default function OverallFeedbackStatus() {
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchComplaints = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/complaints');
            if (!response.ok) throw new Error("Failed to fetch complaints.");
            const data = await response.json();
            setComplaints(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComplaints();
    }, []);


    const renderSkeletons = () => (
        Array.from({ length: 10 }).map((_, index) => (
            <TableRow key={`skeleton-${index}`}>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                <TableCell className="text-center"><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
            </TableRow>
        ))
    );

    return (
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle>Overall Feedback Status</CardTitle>
                <CardDescription>View the status of all submitted feedback in the community.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[65vh] rounded-md border">
                    <Table>
                        <TableHeader className="sticky top-0 bg-secondary">
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Complaint ID</TableHead>
                                <TableHead>Category/Type</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? renderSkeletons() : error ? (
                                <TableRow><TableCell colSpan={5} className="text-center text-destructive">{error}</TableCell></TableRow>
                            ) : complaints.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No complaints or suggestions found.</TableCell></TableRow>
                            ) : (
                                complaints.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>{item.submissionDate}</TableCell>
                                        <TableCell>{item.id}</TableCell>
                                        <TableCell className="font-medium">{item.formType === 'Complaint' ? item.issueCategory : 'Suggestion'}</TableCell>
                                        <TableCell className="max-w-xs truncate">{item.description}</TableCell>
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
    );
}
