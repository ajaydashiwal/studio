
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"
import { Loader2 } from "lucide-react"

const formSchema = z.object({
  formType: z.enum(["Complaint", "Suggestion"]),
  issueCategory: z.string().optional(),
  description: z.string().min(10, { message: "Description must be at least 10 characters long." }).max(500, { message: "Description cannot exceed 500 characters." }),
}).refine(data => {
    if (data.formType === 'Complaint') {
        return !!data.issueCategory && data.issueCategory.length > 0;
    }
    return true;
}, {
    message: "Please select an issue category for your complaint.",
    path: ["issueCategory"],
});

interface ComplaintSuggestionFormProps {
    flatNo: string;
    ownerName: string;
}

const issueCategories = [
    "Water Overflow",
    "GT Block/Overflow",
    "Sweeping Issue",
    "Street Light Issues",
    "Unattended Vehicles",
    "Others"
];

export default function ComplaintSuggestionForm({ flatNo, ownerName }: ComplaintSuggestionFormProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<"Complaint" | "Suggestion">("Complaint");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      formType: activeTab,
      description: "",
      issueCategory: "",
    }
  });

  const handleTabChange = (value: string) => {
    const newTabValue = value as "Complaint" | "Suggestion";
    setActiveTab(newTabValue);
    form.setValue("formType", newTabValue);
    form.clearErrors(); // Clear errors when switching tabs
    form.reset({
        formType: newTabValue,
        description: "",
        issueCategory: "",
    })
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    
    const submissionData = {
        ...values,
        flatNo,
        ownerName
    };
    
    try {
        const response = await fetch('/api/complaints', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submissionData),
        });

        const result = await response.json();

        if (response.ok) {
            toast({
                title: "Feedback Submitted",
                description: result.message,
            });
            form.reset({
                formType: activeTab,
                description: "",
                issueCategory: "",
            });
        } else {
            toast({
                variant: "destructive",
                title: "Submission Failed",
                description: result.error || "Could not submit your feedback.",
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
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full max-w-lg">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="Complaint">File a Complaint</TabsTrigger>
        <TabsTrigger value="Suggestion">Give a Suggestion</TabsTrigger>
      </TabsList>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
          <TabsContent value="Complaint" className="space-y-6">
            <FormField
              control={form.control}
              name="issueCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Issue Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select the category of your complaint" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {issueCategories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
          <TabsContent value="Suggestion" />
          
          <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{activeTab === 'Complaint' ? 'Complaint Details' : 'Suggestion Details'}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={`Please describe your ${activeTab.toLowerCase()} in detail here.`}
                      {...field}
                      rows={5}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          
          <Button type="submit" disabled={isSubmitting}>
             {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit {activeTab}
          </Button>
        </form>
      </Form>
    </Tabs>
  )
}
