
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
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { useToast } from "@/hooks/use-toast"
import { Building, Hash, User as UserIcon, Receipt, CalendarIcon, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { format, parse } from "date-fns"
import { useState } from "react"

const formSchema = z.object({
  flatNo: z.string().min(1, { message: "Flat number is required." }),
  memberName: z.string().min(3, { message: "Member name is required." }),
  receiptNo: z.string().min(1, { message: "Receipt number is required." }),
  receiptDate: z.date({
    required_error: "A date of receipt is required.",
  }),
  membershipNo: z.coerce.number().positive({ message: "A valid membership number is required." }),
  status: z.string().optional(),
})

export default function MembershipEntryForm() {
  const { toast } = useToast()
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [memberExists, setMemberExists] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        flatNo: "",
        memberName: "",
        membershipNo: "" as any,
        receiptNo: "",
        status: "",
    }
  })

  const resetForm = () => {
    form.reset({
        flatNo: "",
        memberName: "",
        membershipNo: "" as any,
        receiptNo: "",
        status: "",
    });
    setMemberExists(false);
    setIsChecking(false);
    setIsUpdating(false);
  }
  
  const handleCheckExistingMember = async (flatNo: string) => {
    if (!flatNo) return;

    setIsChecking(true);
    setMemberExists(false);

    try {
        const response = await fetch(`/api/master-membership/${flatNo}`);
        const data = await response.json();

        if (response.ok && data.exists) {
            setMemberExists(true);
            form.setValue("flatNo", data.flatNo);
            form.setValue("memberName", data.memberName);
            form.setValue("receiptNo", data.receiptNo);
            form.setValue("receiptDate", parse(data.receiptDate, "dd/MM/yyyy", new Date()));
            form.setValue("membershipNo", data.membershipNo);
            form.setValue("status", "Active");
            toast({
                title: "Active Member Found",
                description: `Details for flat ${flatNo} loaded. You can now update their status.`,
            });
        } else {
             toast({
                title: "No Active Member Found",
                description: `You can create a new membership record for flat ${flatNo}.`,
            });
        }
    } catch (error) {
        console.error("Failed to check for existing member", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not fetch member data.",
        })
    } finally {
        setIsChecking(false);
    }
  }

  const handleUpdate = async (values: z.infer<typeof formSchema>) => {
    if (values.status !== 'Inactive') {
        toast({
            variant: "destructive",
            title: "Invalid Action",
            description: "You can only update the status to 'Inactive'.",
        });
        return;
    }
    setIsUpdating(true);
    try {
        const response = await fetch(`/api/master-membership/${values.flatNo}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: values.status }),
        });
        const result = await response.json();
        if (response.ok) {
            toast({
                title: "Success",
                description: result.message,
            });
            resetForm();
        } else {
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: result.error || "Could not update status.",
            });
        }
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not connect to the server.",
        });
    } finally {
        setIsUpdating(false);
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
     if (memberExists) {
        await handleUpdate(values);
        return;
     }

     const formattedValues = {
      ...values,
      receiptDate: format(values.receiptDate, "dd/MM/yyyy"),
    };

    try {
        const response = await fetch('/api/master-membership', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formattedValues),
        });

        const result = await response.json();

        if (response.ok) {
            toast({
                title: "Success",
                description: result.message || "New membership record created successfully.",
            });
            resetForm();
        } else {
             toast({
                variant: "destructive",
                title: response.status === 409 ? "Duplicate Record" : "Submission Failed",
                description: result.error || "Could not save the new membership record.",
            });
             if(response.status === 409){
                setMemberExists(true);
             }
        }
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not connect to the server.",
        });
    }
  }

  const isReadOnly = memberExists || isChecking;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <FormField
              control={form.control}
              name="flatNo"
              render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                  <FormLabel>Flat Number</FormLabel>
                    <FormControl>
                        <div className="relative">
                            <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Enter flat no. & press Tab" 
                                {...field} 
                                className="pl-10" 
                                onBlur={(e) => handleCheckExistingMember(e.target.value)}
                                disabled={isChecking || memberExists}
                             />
                             {isChecking && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
                        </div>
                    </FormControl>
                  <FormMessage />
                  </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="memberName"
              render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                  <FormLabel>Owner/Member Name</FormLabel>
                    <FormControl>
                        <div className="relative">
                            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Enter the full name of the member" {...field} className="pl-10" readOnly={isReadOnly} />
                        </div>
                    </FormControl>
                  <FormMessage />
                  </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="receiptNo"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Receipt No.</FormLabel>
                    <FormControl>
                        <div className="relative">
                            <Receipt className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Enter receipt number" {...field} className="pl-10" readOnly={isReadOnly} />
                        </div>
                    </FormControl>
                  <FormMessage />
                  </FormItem>
              )}
            />
            <FormField
                control={form.control}
                name="receiptDate"
                render={({ field }) => (
                    <FormItem className="flex flex-col pt-2">
                    <FormLabel>Receipt Date</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant={"outline"}
                            className={cn(
                                "w-full justify-start pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                            )}
                            disabled={isReadOnly}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                                format(field.value, "dd/MM/yyyy")
                            ) : (
                                <span>Pick a date</span>
                            )}
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
              control={form.control}
              name="membershipNo"
              render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                  <FormLabel>Membership No.</FormLabel>
                    <FormControl>
                        <div className="relative">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="number" placeholder="Enter membership number" {...field} className="pl-10" readOnly={isReadOnly} />
                        </div>
                    </FormControl>
                  <FormMessage />
                  </FormItem>
              )}
            />
            {memberExists && (
                 <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                            <FormLabel>Update Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a new status" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Active" disabled>Active</SelectItem>
                                    <SelectItem value="Inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}
        </div>
        <div className="flex gap-4">
            <Button type="submit" disabled={isChecking || isUpdating}>
                {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {memberExists ? 'Update Status' : 'Create Record'}
            </Button>
            <Button type="button" variant="outline" onClick={resetForm} disabled={isChecking || isUpdating}>
                Reset
            </Button>
        </div>
      </form>
    </Form>
  )
}
