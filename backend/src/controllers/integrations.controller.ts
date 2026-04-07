import { Request, Response } from 'express';
import { ENV } from '../config/env.js';
import axios from 'axios';
import { UserMongooseModel } from '../models/user.model.js';

export const getSlackAuthUrl = (req: Request, res: Response) => {
    // Generate Slack OAuth URL
    const clientId = ENV.SLACK_CLIENT_ID;
    const redirectUri = ENV.SLACK_REDIRECT_URI;
    
    console.log('[Slack OAuth] 🔗 Generating OAuth URL...');
    console.log('[Slack OAuth]   - Client ID exists:', !!clientId);
    console.log('[Slack OAuth]   - Redirect URI:', redirectUri);
    console.log('[Slack OAuth]   - Auth user:', !!req.user);
    
    if (!clientId) {
        console.error('[Slack OAuth] ❌ Slack Client ID not configured');
        res.status(500).json({ error: "Slack integration not configured on this server." });
        return;
    }

    // Use user_scope to get a user token that can read all public channels easily
    const userScopes = "channels:history,channels:read,users:read,users:read.email";
    
    // Pass user ID as local state to link account in callback
    const state = req.user?.userId;
    console.log('[Slack OAuth]   - User ID (state):', state);
    
    if (!state) {
        console.error('[Slack OAuth] ❌ User not authenticated or no userId');
        res.status(401).json({ error: "User not authenticated" });
        return;
    }

    const authUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&user_scope=${userScopes}&redirect_uri=${redirectUri}&state=${state}`;
    
    console.log('[Slack OAuth] ✅ OAuth URL generated successfully');
    console.log('[Slack OAuth]   - Full URL length:', authUrl.length);
    
    res.json({ url: authUrl });
};

export const handleSlackCallback = async (req: Request, res: Response) => {
    try {
        const { code, state } = req.query;
        console.log('[Slack OAuth Callback] 📌 Received callback with code:', !!code, 'state:', state);
        
        if (!code || typeof code !== 'string') {
            console.error('[Slack OAuth Callback] ❌ Missing authorization code');
            res.status(400).send("Missing authorization code.");
            return;
        }
        
        const userId = state as string;
        if (!userId) {
            console.error('[Slack OAuth Callback] ❌ Missing state parameter (User ID)');
            res.status(400).send("Missing state parameter (User ID).");
            return;
        }
        
        console.log('[Slack OAuth Callback] 👤 User ID from state:', userId);

        // Exchange code for token
        console.log('[Slack OAuth Callback] 🔄 Exchanging authorization code for token...');
        const tokenResponse = await axios.post('https://slack.com/api/oauth.v2.access', null, {
            params: {
                client_id: ENV.SLACK_CLIENT_ID,
                client_secret: ENV.SLACK_CLIENT_SECRET,
                code,
                redirect_uri: ENV.SLACK_REDIRECT_URI
            }
        });

        const { data } = tokenResponse;
        console.log('[Slack OAuth Callback] ✅ Token response received: ok=', data.ok, 'error=', data.error || 'NONE');

        if (!data.ok) {
            console.error('[Slack OAuth Callback] ❌ Slack OAuth Error:', data.error);
            res.status(400).send(`Slack OAuth Error: ${data.error}`);
            return;
        }

        // For user_scope, the token is in data.authed_user.access_token
        const userToken = data.authed_user?.access_token;
        console.log('[Slack OAuth Callback] 🔑 User token extracted: exists=', !!userToken, 'length=', userToken?.length);
        
        if (!userToken) {
            console.error('[Slack OAuth Callback] ❌ No user access token received');
            res.status(400).send("No user access token received.");
            return;
        }

        // Save token to user
        console.log('[Slack OAuth Callback] 💾 Updating user document with Slack integration...');
        console.log('[Slack OAuth Callback]   - UserId:', userId);
        console.log('[Slack OAuth Callback]   - Token length:', userToken.length);
        console.log('[Slack OAuth Callback]   - Team ID:', data.team?.id);
        console.log('[Slack OAuth Callback]   - Team Name:', data.team?.name);
        
        const updateResult = await UserMongooseModel.findByIdAndUpdate(userId, {
            slackIntegration: {
                accessToken: userToken,
                teamId: data.team?.id,
                teamName: data.team?.name,
            }
        }, { new: true });
        
        console.log('[Slack OAuth Callback] ✅ Update completed');
        console.log('[Slack OAuth Callback]   - Document returned:', !!updateResult);
        if (updateResult) {
            console.log('[Slack OAuth Callback]   - SlackIntegration exists:', !!updateResult.slackIntegration);
            console.log('[Slack OAuth Callback]   - Access token saved:', !!updateResult.slackIntegration?.accessToken);
        }

        // The user will typically complete auth via a popup, so we can return a success HTML
        // that closes the popup.
        console.log('[Slack OAuth Callback] 🎉 Sending success response to browser');
        res.send(`
            <html>
                <head><title>Slack Connected</title></head>
                <body>
                    <h2>Connection successful!</h2>
                    <p>You can close this window now.</p>
                    <script>
                        console.log('Popup window loaded, window.opener:', !!window.opener);
                        setTimeout(() => {
                            console.log('Sending message to opener...');
                            if (window.opener) {
                                window.opener.postMessage('slack-auth-success', '*');
                                console.log('Message sent');
                            } else {
                                console.error('window.opener is null');
                            }
                            setTimeout(() => window.close(), 500);
                        }, 1000);
                    </script>
                </body>
            </html>
        `);
    } catch (error) {
        console.error('[Slack OAuth Callback] ❌ Error handling Slack callback:', error);
        res.status(500).send("Internal server error during Slack authentication.");
    }
};

export const getSlackChannels = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        const user = await UserMongooseModel.findById(userId);

        const token = user?.slackIntegration?.accessToken;
        if (!token) {
            res.status(401).json({ error: "Not connected to Slack." });
            return;
        }

        const response = await axios.get('https://slack.com/api/conversations.list', {
            headers: { Authorization: `Bearer ${token}` },
            params: {
                types: 'public_channel',
                exclude_archived: true,
                limit: 100 // We can add cursor pagination later if needed
            }
        });

        if (!response.data.ok) {
            console.error("Slack conversations.list Error:", response.data.error);
            res.status(400).json({ error: response.data.error });
            return;
        }

        res.json({ channels: response.data.channels });
    } catch (error) {
        console.error("Error fetching Slack channels:", error);
        res.status(500).json({ error: "Failed to fetch Slack channels." });
    }
};
