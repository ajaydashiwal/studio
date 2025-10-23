
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
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
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"

const formSchema = z.object({
  flatNo: z.string().min(1, { message: "Flat number is required." }),
  membershipNo: z.coerce.number().positive({ message: "Membership number is required." }),
  ownerName: z.string().min(1, { message: "Owner name is required." }),
  userType: z.enum(["Member", "President", "VicePresident", "GeneralSecretary", "JointSecretary", "Treasurer"], {
    required_error: "Please select a user type.",
  }),
  membershipStatus: z.enum(["Active", "Inactive"], {
    required_error: "Please select a membership status.",
  }),
  isMember: z.boolean().default(false),
})

export default function UserEntryForm() {
  const { toast } = useToast()
  const [isExistingUser, setIsExistingUser] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        flatNo: "",
        membershipNo: "" as any,
        ownerName: "",
        userType: "Member",
        membershipStatus: "Active",
        isMember: true,
    }
  })

  const handleFetchUserData = async (flatNo: string) => {
    if (!flatNo) return;

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
            description: `Details for ${data.ownerName} loaded.`,
        });
      } else {
        // User not found, clear fields for new entry
        form.reset({
            flatNo: flatNo,
            membershipNo: "" as any,
            ownerName: "",
            userType: "Member",
            membershipStatus: "Active",
            isMember: true,
        });
        setIsExistingUser(false);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch user data.",
      });
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
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
                description: result.message || "User data submitted successfully.",
            });
            form.reset();
            form.setValue("userType", "Member");
            form.setValue("membershipStatus", "Active");
            form.setValue("isMember", true);
            setIsExistingUser(false);
        } else {
            toast({
                variant: "destructive",
                title: "Submission Failed",
                description: result.error || "Could not save the user record.",
            });
        }
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not connect to the server.",
        });
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
                        placeholder="Enter flat number to fetch/create" 
                        {...field}
                        onBlur={(e) => handleFetchUserData(e.target.value)}
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
            name="userType"
            render={({ field }) => (
                <FormItem>
                <FormLabel>User Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a user type" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="Member">Member</SelectItem>
                        <SelectItem value="President">President</SelectItem>
                        <SelectItem value="VicePresident">Vice-President</SelectItem>
                        <SelectItem value="GeneralSecretary">General Secretary</SelectItem>
                        <SelectItem value="JointSecretary">Joint Secretary</SelectItem>
                        <SelectItem value="Treasurer">Treasurer</SelectItem>
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
                        <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
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
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 col-span-1 md:col-span-2">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Is General Body Member?
                    </FormLabel>
                    <FormDescription>
                      Indicates if the user is a part of the general body.
                    </FormDescription>
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
        <Button type="submit">{isExistingUser ? 'Update User' : 'Create User'}</Button>
      </form>
    </Form>
  )
}
