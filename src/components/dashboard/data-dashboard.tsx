import type { User } from '@/lib/data';
import { spreadsheetData } from '@/lib/data';
import AppHeader from '@/components/dashboard/app-header';
import DataTable from '@/components/dashboard/data-table';
import DataEntryForm from '@/components/dashboard/data-entry-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"

interface DataDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function DataDashboard({ user, onLogout }: DataDashboardProps) {
  return (
    <div className="w-full max-w-5xl space-y-6">
      <AppHeader user={user} onLogout={onLogout} />
      <main>
        <Tabs defaultValue="statement">
          <TabsList className={`grid w-full ${user.userType === 'Treasurer' ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <TabsTrigger value="statement">Account Statement</TabsTrigger>
            {user.userType === 'Treasurer' && (
              <TabsTrigger value="entry">Data Entry</TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="statement">
            <DataTable data={spreadsheetData} />
          </TabsContent>
          {user.userType === 'Treasurer' && (
            <TabsContent value="entry">
               <Card className="shadow-md">
                <CardContent className="pt-6">
                  <DataEntryForm />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}
