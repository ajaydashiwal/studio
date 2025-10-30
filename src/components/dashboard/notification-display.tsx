
"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Megaphone, User, Calendar } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Notification {
    id: string;
    message: string;
    createdBy: string;
    timestamp: string;
}

export default function NotificationDisplay() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchNotifications = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch('/api/notifications');
                if (!response.ok) {
                    throw new Error("Failed to fetch notifications.");
                }
                const data: Notification[] = await response.json();
                setNotifications(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : "An unknown error occurred");
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();
    }, []);

    if (loading) {
        return (
            <Card className="shadow-md">
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                </CardContent>
            </Card>
        );
    }
    
    if (error) {
        return (
            <Alert variant="destructive">
                <Megaphone className="h-4 w-4" />
                <AlertTitle>Error Fetching Notifications</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }


    return (
        <Card className="shadow-lg border-primary/20">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <Megaphone className="h-6 w-6 text-primary" />
                    <div>
                        <CardTitle className="text-xl font-bold tracking-tight">RWA Announcements</CardTitle>
                        <CardDescription>Important updates and messages from the RWA.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {notifications.length === 0 ? (
                    <div className="flex items-center justify-center h-24 text-muted-foreground">
                        No announcements at the moment.
                    </div>
                ) : (
                    <ScrollArea className="h-64 w-full">
                        <div className="space-y-6 pr-6">
                            {notifications.map(notification => (
                                <div key={notification.id} className="p-4 rounded-lg border bg-background/50">
                                    <p className="text-sm text-foreground mb-3">{notification.message}</p>
                                    <div className="flex items-center justify-end text-xs text-muted-foreground gap-4">
                                        <div className="flex items-center gap-1.5">
                                            <User className="h-3 w-3" />
                                            <span>{notification.createdBy}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="h-3 w-3" />
                                            <span>{notification.timestamp}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}
