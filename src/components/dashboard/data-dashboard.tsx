
'use client';

import { useState, useEffect } from 'react';
import type { User } from '@/lib/data';
import AppHeader from '@/components/dashboard/app-header';
import DataTable from '@/components/dashboard/data-table';
import SummaryTable from '@/components/dashboard/summary-table';
import DataEntryForm from '@/components/dashboard/data-entry-form';
import UserEntryForm from '@/components/dashboard/user-entry-form';
import MembershipEntryForm from '@/components/dashboard/membership-entry-form';
import ChangePasswordForm from '@/components/dashboard/change-password-form';
import ExpenditureEntryForm from '@/components/dashboard/expenditure-entry-form';
import ComplaintSuggestionForm from '@/components/dashboard/complaint-suggestion-form';
import ComplaintManagement from '@/components/dashboard/complaint-management';
import OverviewDashboard from '@/components/dashboard/overview-dashboard';
import OverallFeedbackStatus from '@/components/dashboard/overall-feedback-status';
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

type View = 'overview' | 'statement' | 'entry' | 'expenditureEntry' | 'userEntry' | 'membershipEntry' | 'changePassword' | 'memberSummary' | 'nonMemberSummary' | 'financials' | 'feedback' | 'complaintManagement' | 'overallFeedback';

export default function DataDashboard({ user, onLogout }: DataDashboardProps) {
  const [activeView, setActiveView] = useState<View>('overview');
  
  const isTreasurer = user.userType === 'Treasurer';
  const isMember = user.userType === 'Member';
  const isGeneralSecretary = user.userType === 'GeneralSecretary';
  const isOfficeBearer = !isMember;

  useEffect(() => {
    setActiveView('overview');
  }, [user]);

  const renderContent = () => {
    switch (activeView) {
      case 'overview':
        return <OverviewDashboard user={user} />;
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
              <CardContent>
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
              <CardContent>
                <UserEntryForm />
              </CardContent>
            </Card>
          );
        }
        return null;
        case 'membershipEntry':
            if (isGeneralSecretary) {
                return (
                    <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle>New Membership Record</CardTitle>
                            <CardDescription>
                                Add a new record to the master membership list.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <MembershipEntryForm />
                        </CardContent>
                    </Card>
                );
            }
            return null;
        case 'expenditureEntry':
            if (isTreasurer) {
                return (
                    <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle>Expenditure Entry</CardTitle>
                            <CardDescription>
                                Record an outgoing payment or expense.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ExpenditureEntryForm />
                        </CardContent>
                    </Card>
                );
            }
            return null;
        case 'financials':
             if (isOfficeBearer) {
                return (
                    <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle>Financial Dashboard</CardTitle>
                            <CardDescription>
                                Visualizing income and expenditure. (Coming Soon)
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                           <p>Financial charts will be displayed here.</p>
                        </CardContent>
                    </Card>
                );
            }
            return null;
        case 'feedback':
            if(isMember) {
                return (
                     <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle>Complaints & Suggestions</CardTitle>
                            <CardDescription>
                                Submit your feedback to the association.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ComplaintSuggestionForm flatNo={user.flatNo} />
                        </CardContent>
                    </Card>
                )
            }
            return null;
        case 'overallFeedback':
             if (isMember) {
                return <OverallFeedbackStatus />;
            }
            return null;
        case 'complaintManagement':
            if (isOfficeBearer) {
                return <ComplaintManagement />;
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
              <CardContent>
                <ChangePasswordForm flatNo={user.flatNo} />
              </CardContent>
            </Card>
        );
      default:
        return <OverviewDashboard user={user} />;
    }
  };

  return (
    <div className="w-full max-w-6xl space-y-6">
      <AppHeader user={user} onLogout={onLogout} />
      <main>
        <Menubar className="mb-4 flex-wrap h-auto">
            <MenubarMenu>
              <MenubarTrigger>Dashboard</MenubarTrigger>
              <MenubarContent>
                <MenubarItem onClick={() => setActiveView('overview')}>Overview</MenubarItem>
                {isMember && <MenubarItem onClick={() => setActiveView('statement')}>Account Statement</MenubarItem>}
              </MenubarContent>
            </MenubarMenu>

          {isOfficeBearer && (
             <>
                <MenubarMenu>
                    <MenubarTrigger>Reports</MenubarTrigger>
                    <MenubarContent>
                        <MenubarItem onClick={() => setActiveView('memberSummary')}>Member Summary</MenubarItem>
                        <MenubarItem onClick={() => setActiveView('nonMemberSummary')}>Non-Member Summary</MenubarItem>
                    </MenubarContent>
                </MenubarMenu>
                <MenubarMenu>
                    <MenubarTrigger>Financials</MenubarTrigger>
                    <MenubarContent>
                        <MenubarItem onClick={() => setActiveView('financials')}>Dashboard</MenubarItem>
                    </MenubarContent>
                </MenubarMenu>
                <MenubarMenu>
                    <MenubarTrigger>Complaints</MenubarTrigger>
                    <MenubarContent>
                        <MenubarItem onClick={() => setActiveView('complaintManagement')}>Manage Feedback</MenubarItem>
                    </MenubarContent>
                </MenubarMenu>
             </>
          )}

          {isTreasurer && (
            <MenubarMenu>
              <MenubarTrigger>Data Entry</MenubarTrigger>
              <MenubarContent>
                <MenubarItem onClick={() => setActiveView('entry')}>Maintenance Entry</MenubarItem>
                <MenubarItem onClick={() => setActiveView('expenditureEntry')}>Expenditure Entry</MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          )}

          {isGeneralSecretary && (
             <MenubarMenu>
              <MenubarTrigger>Data Entry</MenubarTrigger>
              <MenubarContent>
                <MenubarItem onClick={() => setActiveView('membershipEntry')}>Membership Entry</MenubarItem>
                <MenubarItem onClick={() => setActiveView('userEntry')}>User Entry</MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          )}

          {isMember && (
            <MenubarMenu>
                <MenubarTrigger>Feedback</MenubarTrigger>
                <MenubarContent>
                    <MenubarItem onClick={() => setActiveView('feedback')}>Complaints & Suggestions</MenubarItem>
                    <MenubarItem onClick={() => setActiveView('overallFeedback')}>Overall Feedback Status</MenubarItem>
                </MenubarContent>
            </MenubarMenu>
          )}

          <MenubarMenu>
            <MenubarTrigger>Account</MenubarTrigger>
            <MenubarContent>
              <MenubarItem onClick={() => setActiveView('changePassword')}>Change Password</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
        <div className="mt-2">{renderContent()}</div>
      </main>
    </div>
  );
}
