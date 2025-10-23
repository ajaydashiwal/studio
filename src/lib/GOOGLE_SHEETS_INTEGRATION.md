# Integrating Google Sheets with Your Application

This guide provides the steps to connect your Next.js application to Google Sheets for user authentication and data management. Direct frontend connection to Google Sheets is not secure. You must use a backend (in this case, Next.js API Routes) to handle the logic securely.

## 1. Google Cloud & Google Sheets API Setup

### A. Enable the Google Sheets API
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Make sure you have a project selected or create a new one.
3. In the navigation menu, go to **APIs & Services > Library**.
4. Search for "Google Sheets API" and click **Enable**.

### B. Create a Service Account
A service account is a special type of Google account intended to represent a non-human user that needs to authenticate and be authorized to access data in Google APIs.

1. Go to **APIs & Services > Credentials** in the Cloud Console.
2. Click **Create Credentials > Service account**.
3. Give your service account a name (e.g., "sheets-editor") and a description.
4. Click **Create and Continue**.
5. For the role, select **Project > Editor** to grant it broad permissions for this project. For production apps, you should use more fine-grained roles.
6. Click **Continue**, then **Done**.
7. Find the service account you just created in the list. Click the pencil icon to edit it.
8. Go to the **Keys** tab. Click **Add Key > Create new key**.
9. Select **JSON** as the key type and click **Create**. A JSON file containing your credentials will be downloaded. **Treat this file like a password. Do not expose it on the frontend.**

### C. Share Your Google Sheet
1. Open your Google Sheet (`https://docs.google.com/spreadsheets/d/1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0`).
2. Click the **Share** button in the top right.
3. In the "Add people and groups" field, paste the `client_email` from the downloaded JSON credentials file. It will look something like `sheets-editor@<your-project-id>.iam.gserviceaccount.com`.
4. Give it **Editor** access and click **Share**.

## 2. Backend Setup: Next.js API Routes

### A. Store Your Credentials Securely
1. Rename the downloaded JSON key file to `google-credentials.json`.
2. Move this file to the root of your project.
3. **IMPORTANT**: Add `google-credentials.json` to your `.gitignore` file to prevent it from being committed to source control.

### B. Install Google APIs Client Library
Open your terminal and run:
```bash
npm install googleapis
```

### C. Create API Routes
Create new files in `src/app/api/`. These will be your secure backend endpoints.

**Example: `src/app/api/auth/login/route.ts` (for validating login)**
```typescript
// src/app/api/auth/login/route.ts
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const RANGE = 'memberUsers!A:D'; // Columns: flatNo, ownerName, membershipId, password

export async function POST(request: Request) {
  const { flatNo, password } = await request.json();

  if (!flatNo || !password) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
  }

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: 'google-credentials.json',
      scopes: 'https://www.googleapis.com/auth/spreadsheets',
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    });

    const rows = response.data.values;
    if (rows) {
      // Find the user (skip header row)
      const userRow = rows.slice(1).find(
        (row) => row[0]?.toLowerCase() === flatNo.toLowerCase() && row[3] === password
      );

      if (userRow) {
        // Don't send the password back to the client
        const user = {
            flatNo: userRow[0],
            ownerName: userRow[1],
            membershipId: userRow[2],
            // You'll need to add userType to your sheet or derive it
            userType: 'Member', // Example
        };
        return NextResponse.json(user);
      }
    }
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  } catch (error) {
    console.error('Error accessing Google Sheets:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```

You would create similar API routes for fetching maintenance data (`/api/maintenance/[flatNo]/route.ts`) and for submitting new entries (`/api/maintenance/route.ts` with POST). When writing data, you'd use `sheets.spreadsheets.values.append(...)`.

## 3. Frontend Integration

Now, update your frontend components to use these new API endpoints instead of the mock data.

**Example: Updating `src/app/page.tsx` `handleLogin` function**
```tsx
// src/app/page.tsx

// ... imports

export default function Home() {
  const [user, setUser] = useState<LoggedInUser | null>(null);
  const { toast } = useToast();

  const handleLogin = async (flatNo: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flatNo, password }),
      });

      if (response.ok) {
        const loggedInUser = await response.json();
        setUser(loggedInUser);
        toast({
          title: "Login Successful",
          description: `Welcome, ${loggedInUser.ownerName}!`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: "Invalid credentials. Please try again.",
        });
      }
    } catch (error) {
       toast({
          variant: "destructive",
          title: "Error",
          description: "Could not connect to the server.",
        });
    }
  };

  // ... rest of the component
}
```

You would apply the same pattern to other components:
-   **DataDashboard**: Fetch data from `/api/maintenance/...` instead of using `spreadsheetData`.
-   **DataEntryForm**: On submit, `POST` the form data to your `/api/maintenance` endpoint.

This approach ensures your application is secure and scalable, correctly separating frontend presentation from backend logic and sensitive credentials.
