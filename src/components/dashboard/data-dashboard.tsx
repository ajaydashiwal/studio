
import type { User } from '@/lib/data';
import { spreadsheetData } from '@/lib/data';
import AppHeader from '@/components/dashboard/app-header';
import DataTable from '@/components/dashboard/data-table';
import DataEntryForm from '@/components/dashboard/data-entry-form';
import MembershipEntryForm from '@/components/dashboard/membership-entry-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface DataDashboardProps {
  user: Omit<User, 'membershipStatus'>;
  onLogout: () => void;
}

export default function DataDashboard({ user, onLogout }: DataDashboardProps) {
  const isTreasurer = user.userType === 'Treasurer';
  const isPresidentOrSecretary = user.userType === 'President' || user.userType === 'GeneralSecretary';

  const getGridCols = () => {
    let cols = 1;
    if (isTreasurer) cols++;
    if (isPresidentOrSecretary) cols++;
    if (cols > 3) cols = 3;
    let gridClass = 'grid-cols-1';
    if (cols === 2) gridClass = 'grid-cols-2';
    if (cols === 3) gridClass = 'grid-cols-3';
    return gridClass;
  };

  return (
    <div className="w-full max-w-5xl space-y-6">
      <AppHeader user={user} onLogout={onLogout} />
      <main>
        <Tabs defaultValue="statement">
          <TabsList className={`grid w-full ${getGridCols()}`}>
            <TabsTrigger value="statement">Account Statement</TabsTrigger>
            {isTreasurer && (
              <TabsTrigger value="entry">Maintenance Entry</TabsTrigger>
            )}
            {isPresidentOrSecretary && (
                <TabsTrigger value="membership">Membership Update</TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="statement">
            <DataTable data={spreadsheetData} />
          </TabsContent>
          {isTreasurer && (
            <TabsContent value="entry">
               <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>Maintenance Fee Entry</CardTitle>
                    <CardDescription>Enter new maintenance fee payment records.</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <DataEntryForm />
                </CardContent>
              </Card>
            </TabsContent>
          )}
          {isPresidentOrSecretary && (
            <TabsContent value="membership">
               <Card className="shadow-md">
                 <CardHeader>
                    <CardTitle>Membership Record Update</CardTitle>
                    <CardDescription>Update membership fee and status for a resident.</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <MembershipEntryForm />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}
