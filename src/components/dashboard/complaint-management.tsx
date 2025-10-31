
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
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { differenceInDays, parse } from "date-fns";

interface Complaint {
    id: string; // Now complaintId
    submissionDate: string;
    flatNo: string;
    formType: string;
    issueCategory: string;
    description: string;
    status: string;
    remarks: string;
    actionDate: string;
}

const statusOptions = ["Open", "In Progress", "Resolved", "Closed"];

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

const calculatePendingDays = (submissionDate: string) => {
    try {
        const date = parse(submissionDate, "dd/MM/yyyy HH:mm:ss", new Date());
        return differenceInDays(new Date(), date);
    } catch {
        return null;
    }
};

export default function ComplaintManagement() {
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateStatus, setUpdateStatus] = useState("");
    const [updateRemarks, setUpdateRemarks] = useState("");
    const { toast } = useToast();

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

    const handleUpdateClick = (complaint: Complaint) => {
        setSelectedComplaint(complaint);
        setUpdateStatus(complaint.status);
        setUpdateRemarks(complaint.remarks);
    };

    const handleUpdateSubmit = async () => {
        if (!selectedComplaint) return;
        setIsUpdating(true);
        try {
            const response = await fetch('/api/complaints', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    complaintId: selectedComplaint.id,
                    status: updateStatus,
                    remarks: updateRemarks,
                }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Failed to update.");

            toast({
                title: "Success",
                description: "Complaint record updated successfully.",
            });
            setSelectedComplaint(null);
            fetchComplaints(); // Refresh the data
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: error instanceof Error ? error.message : "An unknown error occurred.",
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const renderSkeletons = () => (
        Array.from({ length: 10 }).map((_, index) => (
            <TableRow key={`skeleton-${index}`}>
                <TableCell className="sticky left-0 bg-background z-10"><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell className="text-center"><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                 <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell className="text-center"><Skeleton className="h-8 w-20 rounded-md" /></TableCell>
            </TableRow>
        ))
    );

    return (
        <>
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>Manage Complaints & Suggestions</CardTitle>
                    <CardDescription>View and update the status of all submitted feedback.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <div className="h-[65vh] w-full overflow-auto">
                            <Table className="min-w-full">
                                <TableHeader className="sticky top-0 bg-secondary z-10">
                                    <TableRow>
                                        <TableHead className="sticky left-0 bg-secondary z-20 min-w-[150px]">Date</TableHead>
                                        <TableHead className="min-w-[80px]">Flat</TableHead>
                                        <TableHead className="min-w-[150px]">Category/Type</TableHead>
                                        <TableHead className="min-w-[150px]">Complaint ID</TableHead>
                                        <TableHead className="text-center min-w-[120px]">Status</TableHead>
                                        <TableHead className="min-w-[150px]">Pending Since</TableHead>
                                        <TableHead className="text-center min-w-[100px]">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? renderSkeletons() : error ? (
                                        <TableRow><TableCell colSpan={7} className="text-center text-destructive">{error}</TableCell></TableRow>
                                    ) : complaints.length === 0 ? (
                                        <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No complaints or suggestions found.</TableCell></TableRow>
                                    ) : (
                                        complaints.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="sticky left-0 bg-background z-10">{item.submissionDate}</TableCell>
                                                <TableCell>{item.flatNo}</TableCell>
                                                <TableCell className="font-medium">{item.formType === 'Complaint' ? item.issueCategory : 'Suggestion'}</TableCell>
                                                <TableCell>{item.id}</TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant={getStatusBadgeVariant(item.status)} className={getStatusBadgeClass(item.status)}>{item.status}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {item.status === 'Open' ? `${calculatePendingDays(item.submissionDate)} days` : '-'}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button variant="outline" size="sm" onClick={() => handleUpdateClick(item)} disabled={item.status === 'Closed'}>Update</Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={!!selectedComplaint} onOpenChange={(isOpen) => !isOpen && setSelectedComplaint(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Update Feedback Status</DialogTitle>
                        <DialogDescription>
                            Update status and add remarks for the feedback from Flat: {selectedComplaint?.flatNo}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Description</Label>
                            <div className="col-span-3 p-2 border rounded-md bg-muted text-sm max-h-24 overflow-y-auto">
                                {selectedComplaint?.description}
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="status-select" className="text-right">Status</Label>
                            <Select onValueChange={setUpdateStatus} value={updateStatus}>
                                <SelectTrigger id="status-select" className="col-span-3">
                                    <SelectValue placeholder="Select a status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {statusOptions.map(opt => (
                                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="remarks" className="text-right pt-2">Remarks</Label>
                            <Textarea
                                id="remarks"
                                value={updateRemarks}
                                onChange={(e) => setUpdateRemarks(e.target.value)}
                                className="col-span-3"
                                placeholder="Add any relevant comments or action taken details."
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Cancel</Button>
                        </DialogClose>
                        <Button type="button" onClick={handleUpdateSubmit} disabled={isUpdating}>
                            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
