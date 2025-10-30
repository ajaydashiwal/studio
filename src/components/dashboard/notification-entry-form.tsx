
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"
import { Loader2 } from "lucide-react"

const formSchema = z.object({
  message: z.string().min(10, { message: "Message must be at least 10 characters long." }).max(1000, { message: "Message cannot exceed 1000 characters." }),
});

interface NotificationEntryFormProps {
    createdBy: string;
}

export default function NotificationEntryForm({ createdBy }: NotificationEntryFormProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
    }
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    
    const submissionData = {
        ...values,
        createdBy,
    };
    
    try {
        const response = await fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submissionData),
        });

        const result = await response.json();

        if (response.ok) {
            toast({
                title: "Notification Posted",
                description: result.message,
            });
            form.reset();
        } else {
            toast({
                variant: "destructive",
                title: "Submission Failed",
                description: result.error || "Could not post the notification.",
            });
        }
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not connect to the server.",
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-lg">
        <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
            <FormItem>
                <FormLabel>Announcement Message</FormLabel>
                <FormControl>
                <Textarea
                    placeholder="Type your important announcement for all residents here."
                    {...field}
                    rows={6}
                />
                </FormControl>
                <FormMessage />
            </FormItem>
            )}
        />
        
        <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Post Notification
        </Button>
      </form>
    </Form>
  )
}
