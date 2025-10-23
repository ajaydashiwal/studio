
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
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"
import { Switch } from "@/components/ui/switch"

const formSchema = z.object({
  flatNo: z.coerce.number().positive({ message: "Please enter a flat number." }),
  membershipNo: z.coerce.number().positive({ message: "Membership number is required." }),
  ownerName: z.string().min(1, { message: "Owner name is required." }),
  userType: z.string().min(1, { message: "User type is required" }),
  membershipStatus: z.enum(["Active", "Inactive"]),
  isMember: z.boolean().default(true),
});

const userTypes = [
    "Member",
    "President",
    "VicePresident",
    "GeneralSecretary",
    "JointSecretary",
    "Treasurer",
];

export default function UserEntryForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExistingUser, setIsExistingUser] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        flatNo: "" as any,
        membershipNo: "" as any,
        ownerName: "",
        userType: "Member",
        membershipStatus: "Active",
        isMember: true
    }
  });

  const resetForm = () => {
    form.reset({
        flatNo: "" as any,
        membershipNo: "" as any,
        ownerName: "",
        userType: "Member",
        membershipStatus: "Active",
        isMember: true
    });
    setIsExistingUser(false);
  }

  const fetchUserDetails = async (flatNo: number) => {
    if (!flatNo || flatNo <= 0) {
        if (isExistingUser) {
           resetForm();
        }
        return;
    }
    try {
        const response = await fetch(`/api/users/${flatNo}`);
        if (response.ok) {
            const data = await response.json();
            form.setValue("membershipNo", data.membershipNo);
            form.setValue("ownerName", data.ownerName);
            form.setValue("userType", data.userType);
            form.setValue("membershipStatus", data.membershipStatus);
            form.setValue("isMember", data.isMember);
            setIsExistingUser(true);
            toast({
                title: "User Found",
                description: `Displaying existing record for flat ${flatNo}.`,
            });
        } else {
            if (isExistingUser) { 
               const currentFlat = form.getValues("flatNo");
               resetForm();
               form.setValue("flatNo", currentFlat);
            }
             setIsExistingUser(false);
        }
    } catch (error) {
        console.error("Failed to fetch user details", error);
        if (isExistingUser) {
           resetForm();
        }
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    
    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
        });

        const result = await response.json();

        if (response.ok) {
            toast({
                title: "Success",
                description: result.message || "User record saved successfully.",
            });
            resetForm();
        } else {
            toast({
                variant: "destructive",
                title: "Submission Failed",
                description: result.error || "Could not save the record.",
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField
                control={form.control}
                name="flatNo"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Flat Number</FormLabel>
                    <FormControl>
                        <Input 
                            type="number" 
                            placeholder="Enter flat no. and move out" 
                            {...field}
                            onBlur={() => fetchUserDetails(field.value)}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="membershipNo"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Membership No.</FormLabel>
                    <FormControl>
                        <Input 
                            type="number" 
                            placeholder="Enter membership number" 
                            {...field} 
                            readOnly={isExistingUser}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="ownerName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Owner Name</FormLabel>
                    <FormControl>
                        <Input 
                            placeholder="Enter owner's full name" 
                            {...field} 
                            readOnly={isExistingUser}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="userType"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>User Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select user type" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {userTypes.map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="membershipStatus"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Membership Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                        </Trigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="isMember"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-2">
                        <div className="space-y-0.5">
                            <FormLabel>Is Society Member?</FormLabel>
                            <FormMessage />
                        </div>
                        <FormControl>
                            <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            />
                        </FormControl>
                    </FormItem>
                )}
                />
        </div>
        <div className="flex gap-4">
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : isExistingUser ? "Update Record" : "Submit Record"}
            </Button>
             <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting}>
                Clear Form
            </Button>
        </div>
      </form>
    </Form>
  )
}
