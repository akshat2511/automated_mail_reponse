require('dotenv').config();
const axios = require('axios');
const express = require('express');
const { google } = require('googleapis');
const { Queue, Worker } = require('bullmq');
const { Anthropic } = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: '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', // defaults to process.env["ANTHROPIC_API_KEY"]
});

// Configuration for OAuth and API clients
const oAuth2Client = new google.auth.OAuth2(
  '296644603313-ndm19aje45btaisa3eo0co8k5mqsrbo8.apps.googleusercontent.com',
  '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',
  'http://localhost:3000/auth/gmail/callback'
);

const getGmailOAuthURL = () => {
  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send'],
  });
};

const setGmailCredentials = (tokens) => {
  oAuth2Client.setCredentials(tokens);
};

const getGmailClient = () => {
  return google.gmail({ version: 'v1', auth: oAuth2Client });
};

const analyzeEmailContent = async (content) => {
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 5,
      messages: [{ role: "user", content: `Categorize the following email content Output only one number out of the three nothing else: "${content}"\n\nCategories:\n1 if Interested,2 if NotInterested,3 if Moreinformation` }],
    });
    console.log(response.content[0].text);
    return response.content[0].text;
  } catch (error) {
    console.error("Error analyzing email content:", error);
  }
};

const generateEmailResponse = async (content) => {
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 150,
      messages: [{ role: "user", content: `Generate an email response based on the following content: "${content}"` }],
    });
    console.log(response.content[0].text);
    return response.content[0].text;
  } catch (error) {
    console.error("Error generating email response:", error);
  }
};

const fetchGmailMessages = async () => {
  const gmail = getGmailClient();
  const res = await gmail.users.messages.list({ userId: 'me' });
  return res.data.messages || [];
};

const fetchGmailMessage = async (messageId) => {
  const gmail = getGmailClient();
  try {
    const res = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });
    return res.data;
  } catch (error) {
    console.error('Error fetching message:', error.message);
    throw error;
  }
};

const sendGmailMessage = async (from, to, subject, message) => {
  const gmail = getGmailClient();
  // const from = 'sahuakshat2511@gmail.com'; // Replace with the authenticated sender's email address

  const email = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    // 'Content-Type: text/html; charset=utf-8',
    '',
    message
  ].join('\n');

  const rawMessage = Buffer.from(email)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  try {
    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: rawMessage
      }
    });
    console.log('Message sent successfully:', res.data);
    return res.data;
  } catch (error) {
    console.error('Error sending message:', error.message);
    throw error;
  }
};

// Outlook configuration
const clientId = "a38aad7f-a695-4d2a-92a5-a2fac9386c82";
const clientSecret = "1eb8Q~AO3G3eUYih7fh~MPsSaOqLj7EHL5FVJa3f";
const redirectUri = "http://localhost:3000/auth/outlook/callback";
const scope = 'https://graph.microsoft.com/.default';

let outlookTokens = null;

const getOutlookOAuthURL = () => {
  const authorizationUrl = 'https://login.microsoftonline.com/630534d0-a9d0-4525-a405-8841234a8713/oauth2/v2.0/authorize';
  const responseType = 'code';
  const state = 'random_state_string';

  return `${authorizationUrl}?client_id=${clientId}&response_type=${responseType}&redirect_uri=${redirectUri}&scope=${scope}&response_mode=query&state=${state}`;
};

const refreshOutlookToken = async () => {
  const tokenUrl = 'https://login.microsoftonline.com/630534d0-a9d0-4525-a405-8841234a8713/oauth2/v2.0/token';

  try {
    const tokenResponse = await axios.post(tokenUrl, new URLSearchParams({
      client_id: clientId,
      scope: scope,
      refresh_token: outlookTokens.refresh_token,
      grant_type: 'refresh_token',
      client_secret: clientSecret,
    }));

    outlookTokens = tokenResponse.data;
    return outlookTokens.access_token;
  } catch (error) {
    console.error('Error refreshing Outlook token:', error.message);
    throw error;
  }
};

const fetchOutlookMessages = async () => {
  try {
    console.log("Access Token:", outlookTokens.access_token);
    const res = await axios.get('https://graph.microsoft.com/v1.0/me/messages', {
      headers: { Authorization: `Bearer ${outlookTokens.access_token}` }
    });
    return res.data.value;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('Access token expired. Refreshing token...');
      try {
        const newAccessToken = await refreshOutlookToken();
        console.log('New Access Token:', newAccessToken);

        const res = await axios.get('https://graph.microsoft.com/v1.0/me/messages', {
          headers: { Authorization: `Bearer ${newAccessToken}` }
        });

        return res.data.value;
      } catch (refreshError) {
        console.error('Error fetching Outlook messages after token refresh:', refreshError.message);
        throw refreshError;
      }
    } else {
      console.error('Error fetching Outlook messages:', error.message);
      throw error;
    }
  }
};

const fetchOutlookMessage = async (messageId) => {
  try {
    const res = await axios.get(`https://graph.microsoft.com/v1.0/me/messages/${messageId}`, {
      headers: { Authorization: `Bearer ${outlookTokens.access_token}` }
    });
    return res.data;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('Access token expired. Refreshing token...');
      try {
        const newAccessToken = await refreshOutlookToken();
        console.log('New Access Token:', newAccessToken);

        const res = await axios.get(`https://graph.microsoft.com/v1.0/me/messages/${messageId}`, {
          headers: { Authorization: `Bearer ${newAccessToken}` }
        });

        return res.data;
      } catch (refreshError) {
        console.error('Error fetching Outlook message after token refresh:', refreshError.message);
        throw refreshError;
      }
    } else {
      console.error('Error fetching Outlook message:', error.message);
      throw error;
    }
  }
};

const sendOutlookMessage = async (message) => {
  try {
    await axios.post('https://graph.microsoft.com/v1.0/me/sendMail', { message }, {
      headers: { Authorization: `Bearer ${outlookTokens.access_token}` }
    });
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('Access token expired. Refreshing token...');
      try {
        const newAccessToken = await refreshOutlookToken();
        console.log('New Access Token:', newAccessToken);

        await axios.post('https://graph.microsoft.com/v1.0/me/sendMail', { message }, {
          headers: { Authorization: `Bearer ${newAccessToken}` }
        });
      } catch (refreshError) {
        console.error('Error sending Outlook message after token refresh:', refreshError.message);
        throw refreshError;
      }
    } else {
      console.error('Error sending Outlook message:', error.message);
      throw error;
    }
  }
};

const handleGmailWebhook = async () => {
  const messages = await fetchGmailMessages();
  for (const message of messages) {
    const email = await fetchGmailMessage(message.id);
    const headers = email.payload.headers;
    const fromHeader = headers.find(header => header.name === 'From');
    const toHeader = headers.find(header => header.name === 'To');
    const toMail = toHeader ? toHeader.value : '';
    const senderEmail = fromHeader ? fromHeader.value : '';
    const senderId = senderEmail.split('<')[1].split('>')[0];
    console.log(senderId);
    const emailContent = Buffer.from(email.payload.parts[0].body.data, 'base64').toString('utf-8');
    const context = await analyzeEmailContent(emailContent);
    console.log(emailContent);
    let response = '';
    switch (context) {
      case '1':
        response = await generateEmailResponse(`Would you like to hop on a demo call? sender mail: ${senderId}, email by sender ${emailContent} and write dear sender according to the name in email address and remove the line Here's a generated email response based on the provided content`);
        await sendGmailMessage(toMail, senderId, "Thank You For Showing Interest", response);
        break;
      case '2':
        response = "Thank you for your time.";
        await sendGmailMessage(toMail, senderId, "Dear User", "Thank you for your time.");
        break;
      case '3':
        response = "Can you please provide more details?";
        await sendGmailMessage(toMail, senderId, "Dear User", "Tell Us How can we assist you?");
        break;
    }
    console.log(response);
  }
};

const handleOutlookWebhook = async () => {
  const messages = await fetchOutlookMessages();
  for (const message of messages) {
    const email = await fetchOutlookMessage(message.id);
    const emailContent = email.body.content;
    console.log(emailContent);

    const context = await analyzeEmailContent(emailContent);
    let response = '';

    switch (context) {
      case '1':
        response = await generateEmailResponse(`Would you like to hop on a demo call? sender mail: ${email.from.emailAddress.address}, email by sender ${emailContent} and write dear sender according to the name in email address and remove the line Here's a generated email response based on the provided content`);
        await sendOutlookMessage({
          subject: `Re: ${email.subject}`,
          body: {
            contentType: "Text",
            content: response,
          },
          toRecipients: [{ emailAddress: { address: email.from.emailAddress.address } }],
        });
        break;
      case '2':
        response = "Thank you for your time.";
        await sendOutlookMessage({
          subject: `Re: ${email.subject}`,
          body: {
            contentType: "Text",
            content: response,
          },
          toRecipients: [{ emailAddress: { address: email.from.emailAddress.address } }],
        });
        break;
      case '3':
        response = "Can you please provide more details?";
        await sendOutlookMessage({
          subject: `Re: ${email.subject}`,
          body: {
            contentType: "Text",
            content: response,
          },
          toRecipients: [{ emailAddress: { address: email.from.emailAddress.address } }],
        });
        break;
    }
    console.log(response);
  }
};

const connection = {
  host: 'localhost',
  port: 6379,
};

const gmailQueue = new Queue('gmailQueue', { connection });
const outlookQueue = new Queue('outlookQueue', { connection });

new Worker('gmailQueue', handleGmailWebhook, { connection });
new Worker('outlookQueue', handleOutlookWebhook, { connection });

const scheduleEmailChecks = async () => {
  await gmailQueue.add('checkGmail', {}, { repeat: { every: 10000 } });
  await outlookQueue.add('checkOutlook', {}, { repeat: { every: 10000 } });
};

const app = express();
const port = process.env.PORT || 3000;

app.get('/auth/gmail', (req, res) => {
  const url = getGmailOAuthURL();
  res.redirect(url);
});

app.get('/auth/gmail/callback', async (req, res) => {
  const { code } = req.query;
  const { tokens } = await oAuth2Client.getToken(code);
  setGmailCredentials(tokens);
  res.send('Gmail authenticated');
});

app.get('/auth/outlook', (req, res) => {
  const url = getOutlookOAuthURL();
  res.redirect(url);
});

app.get('/logout', async (req, res) => {
  // Revoke the access token
  const revokeUrl = `https://login.microsoftonline.com/630534d0-a9d0-4525-a405-8841234a8713/oauth2/v2.0/logout`;
  try {
    await axios.post(revokeUrl, new URLSearchParams({
      client_id: clientId,
      token: outlookTokens.access_token,
    }));
  } catch (error) {
    console.error('Error revoking token', error);
  }

  // Redirect to Microsoft logout endpoint
  const logoutUrl = `https://login.microsoftonline.com/630534d0-a9d0-4525-a405-8841234a8713/oauth2/v2.0/logout?post_logout_redirect_uri=http://localhost:3000/`;
  res.redirect(logoutUrl);
});

app.get('/auth/outlook/callback', async (req, res) => {
  const code = req.query.code;

  const tokenUrl = 'https://login.microsoftonline.com/630534d0-a9d0-4525-a405-8841234a8713/oauth2/v2.0/token';

  try {
    const tokenResponse = await axios.post(tokenUrl, new URLSearchParams({
      client_id: clientId,
      scope: scope,
      code: code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      client_secret: clientSecret,
    }));

    outlookTokens = tokenResponse.data;
    res.send('Outlook authenticated');
  } catch (error) {
    console.error('Error authenticating Outlook:', error.message);
    res.status(500).send('Error authenticating Outlook');
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  scheduleEmailChecks();
});
