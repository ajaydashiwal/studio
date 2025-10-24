
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
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"

const formSchema = z.object({
  flatNo: z.string().min(1, { message: "Flat number is required." }),
  membershipNo: z.coerce.number().positive({ message: "Membership number is required." }),
  ownerName: z.string().min(1, { message: "Owner name is required." }),
  userType: z.enum(["Member", "President", "VicePresident", "GeneralSecretary", "JointSecretary", "Treasurer"], {
    required_error: "Please select a user type.",
  }),
  membershipStatus: z.enum(["Active", "Inactive"]),
  isOfficeBearer: z.enum(["Yes", "No"], {
    required_error: "Please select if this user is an office bearer.",
  }),
})

export default function UserEntryForm() {
  const { toast } = useToast()
  const [isFetchedAndPending, setIsFetchedAndPending] = useState(false);
  const [isManuallyCreatable, setIsManuallyCreatable] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        flatNo: "",
        membershipNo: "" as any,
        ownerName: "",
        userType: "Member",
        membershipStatus: "Active", // Still needed to pass validation
        isOfficeBearer: "No",
    }
  })

  const resetForm = (flatNo = "") => {
    form.reset({
        flatNo: flatNo,
        membershipNo: "" as any,
        ownerName: "",
        userType: "Member",
        membershipStatus: "Active",
        isOfficeBearer: "No",
    });
    setIsFetchedAndPending(false);
    setIsManuallyCreatable(false);
    setIsChecking(false);
  }

  const handleFetchUserData = async (flatNo: string) => {
    if (!flatNo) return;
    setIsChecking(true);

    try {
      const response = await fetch(`/api/users/${flatNo}`);
      if (response.ok) {
        const data = await response.json();
        form.setValue("membershipNo", data.membershipNo);
        form.setValue("ownerName", data.ownerName);
        form.setValue("userType", data.userType);
        
        setIsFetchedAndPending(true);
        setIsManuallyCreatable(false);

        toast({
            title: "Pending User Data Found",
            description: `Details for ${data.ownerName} loaded. You can now create this user.`,
        });
      } else {
        // Not found, allow manual entry
        resetForm(flatNo);
        setIsManuallyCreatable(true);
        toast({
            title: "New User",
            description: "No pending record found. Please enter details manually to create a new user.",
        });
      }
    } catch (error) {
      resetForm(flatNo);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch user data.",
      });
    } finally {
        setIsChecking(false);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const url = '/api/users';
    const method = 'POST';
    const body = JSON.stringify(values);

    try {
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body,
        });

        const result = await response.json();

        if (response.ok) {
            toast({
                title: "Success",
                description: result.message || "User created successfully.",
            });
            resetForm();
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

  const isReadOnly = isFetchedAndPending;

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
                        placeholder="Enter flat no & press Tab to fetch" 
                        {...field}
                        onBlur={() => handleFetchUserData(field.value)}
                        disabled={isFetchedAndPending || isManuallyCreatable || isChecking}
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
                        placeholder={isChecking ? "Checking..." : "Auto-filled or enter manually"}
                        {...field}
                        readOnly={isReadOnly}
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
                        placeholder={isChecking ? "Checking..." : "Auto-filled or enter manually"}
                        {...field}
                        readOnly={isReadOnly}
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
            name="isOfficeBearer"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Office Bearer</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Is this user an office bearer?" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="No">No</SelectItem>
                        <SelectItem value="Yes">Yes</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <div className="flex gap-4">
            <Button type="submit" disabled={isChecking || (!isFetchedAndPending && !isManuallyCreatable)}>
                Create User
            </Button>
            <Button variant="outline" type="button" onClick={() => resetForm()}>
                Cancel
            </Button>
        </div>
        <FormDescription>
            Enter a flat number and press Tab to find a pending membership record. If found, details will be auto-filled. If not, you can create a new user manually.
        </FormDescription>
      </form>
    </Form>
  )
}
