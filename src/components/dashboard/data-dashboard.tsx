import type { User } from '@/lib/data';
import { spreadsheetData } from '@/lib/data';
import AppHeader from '@/components/dashboard/app-header';
import DataTable from '@/components/dashboard/data-table';

interface DataDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function DataDashboard({ user, onLogout }: DataDashboardProps) {
  return (
    <div className="w-full max-w-5xl space-y-6">
      <AppHeader user={user} onLogout={onLogout} />
      <main>
        <DataTable data={spreadsheetData} />
      </main>
    </div>
  );
}
