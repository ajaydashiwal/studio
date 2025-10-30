# Upvan Apartments RWA Application Documentation

## 1. Project Overview

This application is a comprehensive management portal for the Upvan Apartments Resident Welfare Association (RWA). It is designed to digitize and streamline various administrative tasks, facilitate communication, and provide residents with transparent access to their financial records and community information. The system supports different roles with specific permissions, such as Members, the Treasurer, and the General Secretary.

The application's backend is uniquely powered by **Google Sheets**, which serves as the database for all application data.

---

## 2. Technology Stack

- **Framework**: Next.js 15 (with App Router)
- **Language**: TypeScript
- **UI Library**: React
- **Styling**: Tailwind CSS
- **UI Components**: ShadCN UI
- **State Management**: React Hooks (`useState`, `useEffect`) and component-level state.
- **Form Handling**: React Hook Form with Zod for validation.
- **Charting**: Recharts
- **Backend/Database**: Google Sheets API integrated via Next.js API Routes.

---

## 3. Core Architecture: Google Sheets as a Database

The application does not use a traditional database. Instead, it leverages a Google Spreadsheet as its data source. All interactions with the data (reading, writing, updating) are handled securely through **Next.js API Routes**.

### Key Concepts:
- **Security**: The frontend **never** interacts directly with the Google Sheets API. All requests are proxied through the Next.js backend, which authenticates using a secure service account.
- **Service Account**: A Google Cloud Service Account is used to programmatically access the spreadsheet. Its credentials are stored in the `google-credentials.json` file in the project root.
- **IMPORTANT**: The `google-credentials.json` file is highly sensitive and **must** be kept out of version control (i.e., listed in `.gitignore`).
- **Data Models**: The application's data is organized into different sheets (tabs) within a single Google Spreadsheet, such as `memberUsers`, `masterMembership`, `monthCollection`, `complaintTrans`, etc.

---

## 4. Application Flow

### 4.1. Authentication
1.  **Login Form**: The user enters their Flat Number and Password on the login screen.
2.  **API Request**: The form submits a `POST` request to `/api/auth/login`.
3.  **Backend Validation**:
    - The API route reads the `memberUsers` sheet.
    - It finds the row corresponding to the entered `flatNo`.
    - It securely compares the MD5 hash of the provided password with the stored hash in the sheet.
4.  **Response**:
    - If credentials are valid, the user's data (name, flat no, user type) is returned, and the user is logged into the dashboard.
    - If invalid, a `401 Unauthorized` error is returned.

### 4.2. Role-Based Access Control (RBAC)
- After login, the user's `userType` (e.g., 'Member', 'Treasurer', 'GeneralSecretary') determines which UI elements and functionality are available.
- This logic is managed in the `DataDashboard` component (`src/components/dashboard/data-dashboard.tsx`).
- **Examples**:
    - **Treasurer**: Can access Maintenance and Expenditure data entry forms.
    - **General Secretary**: Can access Membership and User creation forms.
    - **Member**: Can view their account statement and submit feedback.
    - **Office Bearers** (any non-Member role): Can view summary reports and manage community feedback.

### 4.3. Dashboard Views
The `DataDashboard` component acts as the main layout, rendering different views based on the user's menu selection.

- **Overview**: The default view. Displays summary charts (maintenance status, financial summary), recent notifications, and a list of community complaints.
- **Account Statement**: (Member) Shows a detailed table of maintenance payments and dues for the logged-in user.
- **Data Entry Forms**: (Treasurer/Secretary) Various forms for adding new records (maintenance, expenditure, users, memberships).
- **Reports**: (Office Bearers) Tables summarizing financial data for members and non-members, and an expenditure report.
- **Feedback Management**: (Office Bearers) A view to update the status and add remarks to complaints and suggestions.

---

## 5. Key Features & API Logic

### 5.1. User & Membership Management (General Secretary)
- **Flow**: A two-step process to prevent duplicate users.
    1.  **New Membership Entry** (`/api/master-membership`): A new member is first added to the `masterMembership` sheet. Their status is initially blank, marking them as an "active" but "unprocessed" member. The API prevents adding a new active member if one for the same flat already exists.
    2.  **User Creation** (`/api/users`):
        - The admin enters a flat number in the User Entry form.
        - A `GET` request to `/api/users/[flatNo]` is triggered.
        - **Logic**:
            1. The API first checks the `memberUsers` sheet. If a user for that flat already exists, it returns a `409 Conflict` error.
            2. If no user exists, it then checks the `masterMembership` sheet for an active (blank status) record.
            3. If found, it returns the member's details to pre-fill the form.
            4. If not found, it returns a `404 Not Found` error.
        - The admin can then create the user, which adds a new row to the `memberUsers` sheet with a default password hash.

### 5.2. Maintenance Fee Management (Treasurer)
- **Data Entry**: The form (`DataEntryForm`) supports single-month and bulk payments.
- **Validation**:
    - **Amount**: The amount must be a multiple of the standard fee (300).
    - **Month Selection**: For single payments, a dropdown shows available historic and future months fetched from `/api/maintenance/[flatNo]/unpaid`.
    - **Duplicate/Historic Check**: Before submitting, a `GET` request to `/api/maintenance/[flatNo]/[monthYear]` validates that the payment is not a duplicate and adheres to the 6-month limit for historic payments.
- **API Endpoints**:
    - `POST /api/maintenance`: Handles single-month payments.
    - `POST /api/maintenance/bulk`: Handles bulk payments, calculating the correct months to pay based on the selected direction (historic or future).

### 5.3. Complaints & Notifications
- **Submission**: Members can submit complaints or suggestions via the `ComplaintSuggestionForm`. This sends a `POST` request to `/api/complaints`.
- **Management**: Office Bearers can view all feedback in the `ComplaintManagement` component. They can update the `status` and `remarks` of any feedback item, which triggers a `PUT` request to `/api/complaints`.
- **Notifications**: Office Bearers can post announcements. A `POST` to `/api/notifications` adds a new message to the `rwaNotifications` sheet. These are displayed to all users on the overview dashboard, sorted by the most recent timestamp.

### 5.4. Reports & Summaries
- **Data Fetching**: The summary and report pages use a `from` and `to` date range to fetch relevant data.
- **Endpoints**:
    - `/api/summary`: Generates a summary of paid vs. due amounts for members or non-members within a date range.
    - `/api/reports/expenditure`: Aggregates expenditure data by category and month.
- **Dynamic Views**: The `SummaryTable` component includes a dialog that opens a detailed `DataTable` view for any selected flat, allowing for quick drill-down into a specific user's statement.
