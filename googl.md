Step-by-Step Guide: Google Drive API Setup for Your LMS
Overview
You'll need to:

Create a Google Cloud Project
Enable Google Drive API
Create a Service Account (this is like a "robot user")
Get the credentials
Create a folder in Google Drive and share it with the service account
Set up your .env file

Time needed: 15-20 minutes

STEP 1: Create a Google Cloud Project
1.1 Go to Google Cloud Console

Visit: https://console.cloud.google.com/
Sign in with your Google account

1.2 Create New Project

Click on the project dropdown at the top (it might say "Select a project")
Click "NEW PROJECT" button (top right)
Fill in:

Project Name: LMS-Video-Platform (or any name you like)
Organization: Leave as default (No organization)


Click "CREATE"
Wait 10-15 seconds for project creation
Click on the notification bell (top right) to see when it's ready
Click "SELECT PROJECT" in the notification


STEP 2: Enable Google Drive API
2.1 Navigate to APIs

In the left sidebar, click "APIs & Services" → "Library"

Or search for "API Library" in the top search bar



2.2 Enable Drive API

In the search box, type: "Google Drive API"
Click on "Google Drive API" from results
Click the "ENABLE" button
Wait for it to activate (5-10 seconds)


STEP 3: Create a Service Account
3.1 Navigate to Service Accounts

In the left sidebar, click "APIs & Services" → "Credentials"
Click "+ CREATE CREDENTIALS" at the top
Select "Service Account"

3.2 Service Account Details
Screen 1: Service account details

Service account name: lms-drive-access (or any name)
Service account ID: Auto-fills (e.g., lms-drive-access@project-id.iam.gserviceaccount.com)
Description: "Service account for LMS video access"
Click "CREATE AND CONTINUE"

Screen 2: Grant this service account access (Optional)

You can skip this - Click "CONTINUE"

Screen 3: Grant users access (Optional)

You can skip this - Click "DONE"

3.3 Note Down the Service Account Email

You'll see your service account listed
Copy the email address - it looks like: lms-drive-access@your-project-id.iam.gserviceaccount.com
Save this - you'll need it for GOOGLE_SERVICE_ACCOUNT_EMAIL


STEP 4: Create and Download Service Account Key
4.1 Generate Private Key

On the Credentials page, find your service account in the list
Click on the service account name (the email you just created)
Go to the "KEYS" tab at the top
Click "ADD KEY" → "Create new key"
Select "JSON" format
Click "CREATE"

4.2 Download the Key File

A JSON file will automatically download to your computer
File name looks like: your-project-id-1234567890ab.json
IMPORTANT: Keep this file SECURE - it's like a password!
Move it to a safe location (not in public folders)

4.3 Open the JSON File
Open the downloaded file in a text editor (Notepad, VS Code, etc.)
It looks like this:
json{
  "type": "service_account",
  "project_id": "lms-video-platform-123456",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n",
  "client_email": "lms-drive-access@lms-video-platform-123456.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  ...
}
```

**Extract these values:**
1. **`client_email`** → This is your `GOOGLE_SERVICE_ACCOUNT_EMAIL`
2. **`private_key`** → This is your `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

---

## **STEP 5: Create Google Drive Folder**

### 5.1 Create a Folder for Videos
1. Go to **Google Drive**: https://drive.google.com/
2. Click **"+ New"** → **"Folder"**
3. Name it: `LMS-Videos` (or any name)
4. Click **"Create"**

### 5.2 Get the Folder ID
1. **Open the folder** you just created
2. Look at the URL in your browser:
```
   https://drive.google.com/drive/folders/1a2B3c4D5e6F7g8H9i0JkLmNoPqRsTuVw
```
3. The **Folder ID** is the part after `/folders/`:
```
   1a2B3c4D5e6F7g8H9i0JkLmNoPqRsTuVw
```
4. **Copy this ID** - you'll need it for `GOOGLE_DRIVE_FOLDER_ID`

### 5.3 Share Folder with Service Account
**CRITICAL STEP** - Without this, your app can't access the folder!

1. **Right-click** on the folder → **"Share"**
2. In the **"Add people and groups"** field:
   - Paste your **service account email**: `lms-drive-access@your-project-id.iam.gserviceaccount.com`
3. Set permission to **"Editor"** (so your app can upload/read files)
4. **UNCHECK** "Notify people" (it's a robot, not a person!)
5. Click **"Share"** or **"Send"**

---

## **STEP 6: Create Your .env File**

### 6.1 Create the File
In your project root directory (where your code is), create a file named:
```
.env