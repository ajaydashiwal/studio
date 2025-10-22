
import { subMonths } from "date-fns";

export type User = {
  flatNo: string;
  ownerName: string;
  membershipId: number;
  userType: string;
  membershipStatus: 'Active' | 'Inactive';
};

export type MonthlyData = {
  id: number;
  month: string;
  maintenance: string;  
  status: 'Paid' | 'Due';
};

// Mock user data from a "master sheet"
export const mockUsers: (User & { password: string })[] = [
  { flatNo: 'A-101', membershipId: 351, ownerName: 'John Doe', userType: 'Member', password: 'password456', membershipStatus: 'Active' },
  { flatNo: 'B-205', membershipId: 352, ownerName: 'Jane Smith', userType: 'Member', password: 'password456', membershipStatus: 'Inactive' },
  { flatNo: 'R-105', membershipId: 170, ownerName: 'Smith Janes', userType: 'Treasurer', password: 'password456', membershipStatus: 'Active' },
  { flatNo: 'R-104', membershipId: 179, ownerName: 'Doe John', userType: 'President', password: 'password456', membershipStatus: 'Active' },
  { flatNo: 'R-103', membershipId: 119, ownerName: 'Alexander', userType: 'VicePresident', password: 'password456', membershipStatus: 'Inactive' },
  { flatNo: 'R-102', membershipId: 109, ownerName: 'Adam', userType: 'GeneralSecretary', password: 'password456', membershipStatus: 'Active' },
  { flatNo: 'R-101', membershipId: 199, ownerName: 'Philip', userType: 'JointSecretary', password: 'password456', membershipStatus: 'Active' },
];

/**
 * Simulates validating login credentials against the mock user data.
 * In a real app, this would involve a secure backend service.
 */
export const validateLogin = (flatNo: string, password: string): Omit<User, 'membershipStatus'> | null => {
  const user = mockUsers.find(
    (u) => u.flatNo.toLowerCase() === flatNo.toLowerCase() && u.password === password
  );
  if (user) {
    const { password, membershipStatus, ...userData } = user;
    return userData;
  }
  return null;
};

/**
 * Generates mock spreadsheet data for a 24-month period,
 * from October to September.
 */
const generateMonthlyData = (): MonthlyData[] => {
  const data: MonthlyData[] = [];
  const now = new Date();
  
  // Logic to determine the start year for the 24-month cycle
  // The cycle is from October to September. We want the last two full cycles.
  let endYear = now.getFullYear();
  if (now.getMonth() < 9) { // If current month is before October (Jan-Sep)
    endYear = now.getFullYear();
  } else {
    endYear = now.getFullYear() + 1;
  }
  const startYear = endYear - 3;
  //const startYear = 2025;
  
  for (let i = 0; i < 24; i++) {
    // Start from October of the start year
    const date = new Date(startYear, 9 + i, 1);
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    
    data.push({
      id: i + 1,
      month: `${month} ${year}`,
      maintenance: '2000',      
      status: Math.random() > 0.25 ? 'Paid' : 'Due',
    });
  }
  return data.reverse(); // Show most recent first
};

export const spreadsheetData: MonthlyData[] = generateMonthlyData();
