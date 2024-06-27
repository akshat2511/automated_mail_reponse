## Project Overview

This project is an email automation system that integrates with both Gmail and Outlook to fetch, analyze, and respond to emails automatically. The system categorizes email content and generates appropriate responses based on predefined categories using the Anthropic AI. It leverages OAuth for authentication and uses BullMQ for job scheduling to periodically check for new emails.

### Tech Stack

- **Node.js**: Server-side JavaScript runtime.
- **Express**: Web framework for Node.js.
- **Google APIs**: To interact with Gmail using OAuth2.
- **Microsoft Graph API**: To interact with Outlook emails.
- **BullMQ**: Queue system for scheduling email checks.
- **Anthropic AI**: AI for analyzing email content and generating responses.
- **Axios**: Promise-based HTTP client for making API requests.
- **dotenv**: Module to load environment variables from a `.env` file.

## Routes

### Root Route

#### `GET /`

- **Description**: Serves the homepage.
- **Response**: Home page HTML file.

### Gmail Authentication Routes

#### `GET /auth/gmail`

- **Description**: Redirects the user to the Google OAuth2 consent screen.
- **Response**: Redirects to Google OAuth2 consent URL.

#### `GET /auth/gmail/callback`

- **Description**: Handles the OAuth2 callback from Google.
- **Query Params**: `code` - The authorization code returned by Google.
- **Response**: Sets the OAuth2 credentials and serves the Gmail HTML page.

#### `GET /auth/logout`

- **Description**: Logs out the user by revoking Gmail credentials.
- **Response**: Redirects to the home page.

### Outlook Authentication Routes

#### `GET /auth/outlook`

- **Description**: Redirects the user to the Microsoft OAuth2 consent screen.
- **Response**: Redirects to Microsoft OAuth2 consent URL.

#### `GET /auth/outlook/callback`

- **Description**: Handles the OAuth2 callback from Microsoft.
- **Query Params**: `code` - The authorization code returned by Microsoft.
- **Response**: Sets the OAuth2 credentials and serves the Outlook HTML page.

#### `GET /logout`

- **Description**: Logs out the user from Outlook by revoking credentials.
- **Response**: Redirects to the Microsoft logout endpoint and then back to the home page.

### Email Handling

#### `handleGmailWebhook`

- **Description**: Fetches and processes Gmail messages. Analyzes content using Anthropic AI and sends responses based on the analysis.

#### `handleOutlookWebhook`

- **Description**: Fetches and processes Outlook messages. Analyzes content using Anthropic AI and sends responses based on the analysis.

## Detailed Explanation of the Project

The project automates the process of email handling by integrating with Gmail and Outlook services. It uses OAuth2 for authentication, allowing users to grant access to their email accounts securely. Once authenticated, the system periodically checks for new emails using BullMQ, which schedules tasks to fetch emails at regular intervals.

For Gmail, the system uses the Google APIs client library to interact with the Gmail API, fetching emails and sending responses. For Outlook, it uses the Microsoft Graph API to perform similar actions.

When a new email is fetched, the content is analyzed using the Anthropic AI, which categorizes the email into one of three categories:
1. **Interested**: Generates a detailed response asking if the user wants to schedule a demo call.
2. **Not Interested**: Sends a polite thank-you message.
3. **More Information**: Requests more details from the sender.

The generated responses are then sent back to the respective senders via Gmail or Outlook.

## Setting Up the Project

1. **Clone the Repository**: 
   ```sh
   git clone <repository_url>
   ```

2. **Install Dependencies**:
   ```sh
   npm install
   ```

3. **Environment Variables**:
   Create a `.env` file in the root directory and add the following environment variables:
   ```env
   ANTHROPIC_API_KEY=<your_anthropic_api_key>
   PORT=<port_number>
   GMAIL_CLIENT_ID=<your_gmail_client_id>
   GMAIL_CLIENT_SECRET=<your_gmail_client_secret>
   GMAIL_REDIRECT_URI=<your_gmail_redirect_uri>
   OUTLOOK_CLIENT_ID=<your_outlook_client_id>
   OUTLOOK_CLIENT_SECRET=<your_outlook_client_secret>
   OUTLOOK_REDIRECT_URI=<your_outlook_redirect_uri>
   ```

4. **Run the Server**:
   ```sh
   npm start
   ```

5. **Access the Application**:
   Open your browser and navigate to `http://localhost:<port_number>`.

This setup will get your email automation system up and running, ready to handle emails from both Gmail and Outlook.