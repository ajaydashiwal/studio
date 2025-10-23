

'use client';

import { useState } from 'react';
import type { User } from '@/lib/data';
import AppHeader from '@/components/dashboard/app-header';
import DataTable from '@/components/dashboard/data-table';
import SummaryTable from '@/components/dashboard/summary-table';
import DataEntryForm from '@/components/dashboard/data-entry-form';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from '@/components/ui/menubar';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

interface DataDashboardProps {
  user: Omit<User, 'membershipStatus'>;
  onLogout: () => void;
}

type View = 'statement' | 'entry';

export default function DataDashboard({ user, onLogout }: DataDashboardProps) {
  const [activeView, setActiveView] = useState<View>('statement');
  const isTreasurer = user.userType === 'Treasurer';
  const isMember = user.userType === 'Member';

  const renderContent = () => {
    switch (activeView) {
      case 'statement':
        return isMember ? (
          <DataTable flatNo={user.flatNo} />
        ) : (
          <SummaryTable />
        );
      case 'entry':
        if (isTreasurer) {
          return (
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Maintenance Fee Entry</CardTitle>
                <CardDescription>
                  Enter new maintenance fee payment records.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <DataEntryForm />
              </CardContent>
            </Card>
          );
        }
        return null;
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-6xl space-y-6">
      <AppHeader user={user} onLogout={onLogout} />
      <main>
        <Menubar className="mb-4">
          <MenubarMenu>
            <MenubarTrigger
              onClick={() => setActiveView('statement')}
              className={activeView === 'statement' ? 'bg-accent' : ''}
            >
              Account Statement
            </MenubarTrigger>
          </MenubarMenu>
          {isTreasurer && (
            <MenubarMenu>
              <MenubarTrigger
                onClick={() => setActiveView('entry')}
                className={activeView === 'entry' ? 'bg-accent' : ''}
              >
                Maintenance Entry
              </MenubarTrigger>
            </MenubarMenu>
          )}
        </Menubar>
        <div className="mt-2">{renderContent()}</div>
      </main>
    </div>
  );
}
