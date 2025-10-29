
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
import { Loader2 } from "lucide-react"

const formSchema = z.object({
  flatNo: z.string().min(1, { message: "Flat number is required." }),
  membershipNo: z.coerce.number().positive({ message: "Membership number is required." }),
  ownerName: z.string().min(1, { message: "Owner name is required." }),
  userType: z.enum(["Member", "President", "VicePresident", "GeneralSecretary", "JointSecretary", "Treasurer"], {
    required_error: "Please select a user type.",
  }),
})

export default function UserEntryForm() {
  const { toast } = useToast()
  const [isFetched, setIsFetched] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        flatNo: "",
        membershipNo: "" as any,
        ownerName: "",
        userType: "Member",
    }
  })

  const resetForm = (flatNo = "") => {
    form.reset({
        flatNo: flatNo,
        membershipNo: "" as any,
        ownerName: "",
        userType: "Member",
    });
    setIsFetched(false);
    setIsChecking(false);
  }

  const handleFetchUserData = async (flatNo: string) => {
    if (!flatNo) return;
    setIsChecking(true);
    setIsFetched(false); // Reset on new check

    try {
      const response = await fetch(`/api/users/${flatNo}`);
      if (response.ok) {
        const data = await response.json();
        form.setValue("membershipNo", data.membershipNo);
        form.setValue("ownerName", data.ownerName);
        form.setValue("userType", data.userType);
        
        setIsFetched(true);

        toast({
            title: "Pending User Data Found",
            description: `Details for ${data.ownerName} loaded. You can now create this user.`,
        });
      } else {
        // Not found, do not allow manual entry
        resetForm(flatNo);
        toast({
            variant: "destructive",
            title: "No Pending Record",
            description: `No unprocessed membership record was found for Flat No. ${flatNo}. Please create a membership record first.`,
        });
      }
    } catch (error) {
      resetForm(flatNo);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch user data. Could not connect to the server.",
      });
    } finally {
        setIsChecking(false);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const isOfficeBearer = values.userType !== 'Member' ? 'Yes' : 'No';
    const submissionData = {
        ...values,
        isOfficeBearer,
        membershipStatus: "Active", // Always active on creation
    };

    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submissionData),
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

  const isReadOnly = isFetched || isChecking;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
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
                        readOnly={isReadOnly}
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
                        placeholder={isChecking ? "Checking..." : "Auto-filled"}
                        {...field}
                        readOnly
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
                        placeholder={isChecking ? "Checking..." : "Auto-filled"}
                        {...field}
                        readOnly
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
                    <SelectTrigger disabled={!isFetched}>
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
        </div>
        <div className="flex gap-4">
            <Button type="submit" disabled={isChecking || !isFetched}>
                {isChecking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create User
            </Button>
            <Button variant="outline" type="button" onClick={() => resetForm()} disabled={isChecking}>
                Cancel
            </Button>
        </div>
        <FormDescription>
            Enter a flat number and press Tab to find a pending membership record. A user can only be created if a valid, unprocessed record exists in the master membership list.
        </FormDescription>
      </form>
    </Form>
  )
}
