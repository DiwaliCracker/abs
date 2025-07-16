const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

app.get('/', async (req, res) => {
  const target = req.query.url;
  if (!target || !target.startsWith('http')) {
    return res.status(400).json({ error: 'Missing or invalid ?url= parameter' });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    // Set user-agent and simulate iframe
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/114.0.0.0 Safari/537.36'
    );
    await page.setBypassCSP(true);
    await page.setViewport({ width: 1280, height: 720 });

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(window, 'top', {
        get: () => window,
      });
      Object.defineProperty(window, 'frameElement', {
        get: () => document.createElement('iframe'),
      });
    });

    const videoUrls = new Set();

    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('.mp4') || url.includes('.m3u8')) {
        videoUrls.add(url);
      }
    });

    await page.goto(target, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForTimeout(10000);

    await browser.close();
    return res.json({
      success: true,
      input: target,
      found: [...videoUrls].length,
      video_urls: [...videoUrls],
    });
  } catch (err) {
    if (browser) await browser.close();
    return res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('✅ Server started on port 3000');
});
