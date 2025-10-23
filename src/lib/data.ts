
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
  amount: string;  
  status: 'Paid' | 'Due';
  receiptNo: string;
  receiptDate: string;
};

// Mock user data from a "master sheet"
// This is now mainly used for the summary table mock calculation
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
 * THIS IS NOW REPLACED BY /api/auth/login
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
