export type User = {
  flatNo: string;
  ownerName: string;
};

export type MonthlyData = {
  id: number;
  month: string;
  maintenance: string;
  water: string;
  status: 'Paid' | 'Due';
};

// Mock user data from a "master sheet"
const mockUsers: (User & { password: string })[] = [
  { flatNo: 'A-101', ownerName: 'John Doe', password: 'password123' },
  { flatNo: 'B-205', ownerName: 'Jane Smith', password: 'password456' },
];

/**
 * Simulates validating login credentials against the mock user data.
 * In a real app, this would involve a secure backend service.
 */
export const validateLogin = (flatNo: string, password: string): User | null => {
  const user = mockUsers.find(
    (u) => u.flatNo.toLowerCase() === flatNo.toLowerCase() && u.password === password
  );
  if (user) {
    const { password, ...userData } = user;
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
  const startYear = endYear - 2;

  for (let i = 0; i < 24; i++) {
    // Start from October of the start year
    const date = new Date(startYear, 9 + i, 1);
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();

    data.push({
      id: i + 1,
      month: `${month} ${year}`,
      maintenance: (2000 + Math.floor(Math.random() * 500)).toFixed(2),
      water: (500 + Math.floor(Math.random() * 200)).toFixed(2),
      status: Math.random() > 0.15 ? 'Paid' : 'Due',
    });
  }
  return data.reverse(); // Show most recent first
};

export const spreadsheetData: MonthlyData[] = generateMonthlyData();
