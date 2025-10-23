
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
