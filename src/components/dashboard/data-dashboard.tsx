

'use client';

import { useState } from 'react';
import type { User } from '@/lib/data';
import AppHeader from '@/components/dashboard/app-header';
import DataTable from '@/components/dashboard/data-table';
import SummaryTable from '@/components/dashboard/summary-table';
import DataEntryForm from '@/components/dashboard/data-entry-form';
import UserEntryForm from '@/components/dashboard/user-entry-form';
import ChangePasswordForm from '@/components/dashboard/change-password-form';
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

type View = 'statement' | 'entry' | 'userEntry' | 'changePassword' | 'memberSummary' | 'nonMemberSummary';

export default function DataDashboard({ user, onLogout }: DataDashboardProps) {
  const [activeView, setActiveView] = useState<View>('statement');
  
  const isTreasurer = user.userType === 'Treasurer';
  const isMember = user.userType === 'Member';
  const isGeneralSecretary = user.userType === 'GeneralSecretary';
  const isOfficeBearer = !isMember;

  // Set initial view based on user type
  useState(() => {
    if (isMember) {
      setActiveView('statement');
    } else {
      setActiveView('memberSummary');
    }
  });

  const renderContent = () => {
    switch (activeView) {
      case 'statement':
        return <DataTable flatNo={user.flatNo} />;
      case 'memberSummary':
         if (isOfficeBearer) {
          return <SummaryTable summaryType="member" />;
        }
        return null;
      case 'nonMemberSummary':
        if (isOfficeBearer) {
          return <SummaryTable summaryType="non-member" />;
        }
        return null;
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
       case 'userEntry':
        if (isGeneralSecretary) {
          return (
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Member/User Entry</CardTitle>
                <CardDescription>
                  Create new user and membership records.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <UserEntryForm />
              </CardContent>
            </Card>
          );
        }
        return null;
      case 'changePassword':
        return (
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Change Your Password</CardTitle>
                <CardDescription>
                  Update your login password here.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ChangePasswordForm flatNo={user.flatNo} />
              </CardContent>
            </Card>
        );
      default:
        return isMember ? <DataTable flatNo={user.flatNo} /> : <SummaryTable summaryType="member" />;
    }
  };

  return (
    <div className="w-full max-w-6xl space-y-6">
      <AppHeader user={user} onLogout={onLogout} />
      <main>
        <Menubar className="mb-4">
          {isMember && (
            <MenubarMenu>
              <MenubarTrigger
                onClick={() => setActiveView('statement')}
                className={activeView === 'statement' ? 'bg-accent' : ''}
              >
                Account Statement
              </MenubarTrigger>
            </MenubarMenu>
          )}
          {isOfficeBearer && (
            <>
              <MenubarMenu>
                <MenubarTrigger
                  onClick={() => setActiveView('memberSummary')}
                  className={activeView === 'memberSummary' ? 'bg-accent' : ''}
                >
                  Member Summary
                </MenubarTrigger>
              </MenubarMenu>
              <MenubarMenu>
                <MenubarTrigger
                  onClick={() => setActiveView('nonMemberSummary')}
                  className={activeView === 'nonMemberSummary' ? 'bg-accent' : ''}
                >
                  Non-Member Summary
                </MenubarTrigger>
              </MenubarMenu>
            </>
          )}
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
          {isGeneralSecretary && (
              <MenubarMenu>
                <MenubarTrigger
                  onClick={() => setActiveView('userEntry')}
                  className={activeView === 'userEntry' ? 'bg-accent' : ''}
                >
                  User Entry
                </MenubarTrigger>
              </MenubarMenu>
          )}
           <MenubarMenu>
                <MenubarTrigger
                  onClick={() => setActiveView('changePassword')}
                  className={activeView === 'changePassword' ? 'bg-accent' : ''}
                >
                  Change Password
                </MenubarTrigger>
              </MenubarMenu>
        </Menubar>
        <div className="mt-2">{renderContent()}</div>
      </main>
    </div>
  );
}
