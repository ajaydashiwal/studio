
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
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell className="text-center"><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
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
                    <ScrollArea className="h-[65vh] rounded-md border w-full">
                        <Table className="min-w-full">
                            <TableHeader className="sticky top-0 bg-secondary z-10">
                                <TableRow>
                                    <TableHead className="sticky left-0 bg-secondary z-20">Date</TableHead>
                                    <TableHead>Flat</TableHead>
                                    <TableHead>Category/Type</TableHead>
                                    <TableHead>Complaint ID</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                    <TableHead className="text-center">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? renderSkeletons() : error ? (
                                    <TableRow><TableCell colSpan={6} className="text-center text-destructive">{error}</TableCell></TableRow>
                                ) : complaints.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No complaints or suggestions found.</TableCell></TableRow>
                                ) : (
                                    complaints.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="sticky left-0 bg-background z-10">{item.submissionDate}</TableCell>
                                            <TableCell>{item.flatNo}</TableCell>
                                            <TableCell className="font-medium">{item.formType === 'Complaint' ? item.issueCategory : 'Suggestion'}</TableCell>
                                            <TableCell>{item.id}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={getStatusBadgeVariant(item.status)} className={getStatusBadgeColor(item.status)}>{item.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button variant="outline" size="sm" onClick={() => handleUpdateClick(item)}>Update</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
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
