# Cafe Hub — Browser Verifier

Use this skill to visually verify changes to the Cafe Hub app.

## Setup

Start both servers (skip if already running):

```bash
# Terminal 1
cd ~/Desktop/cafe-hub/server && npm run dev &> /tmp/cafe-server.log &

# Terminal 2
cd ~/Desktop/cafe-hub/client && npm run dev &> /tmp/cafe-client.log &
```

Wait for both to be ready:
```bash
sleep 5 && curl -s http://localhost:5001/api/health && curl -s http://localhost:5173 | head -3
```

Set up Playwright if not already available:
```bash
mkdir -p /tmp/cafe-test && cd /tmp/cafe-test && npm init -y && npm install playwright 2>/dev/null | tail -2
```

## Credentials

- Boss (all tabs): `boss` / `boss123`
- Backend: http://localhost:5001
- Frontend: http://localhost:5173

## Screenshot helper

Save this as `/tmp/cafe-test/snap.js` and run with `node /tmp/cafe-test/snap.js`:

```js
const { chromium } = require('playwright');
const SS = '/tmp/cafe-verify';

(async () => {
  require('fs').mkdirSync(SS, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  async function snap(ctx, name) {
    const p = ctx._page;
    await p.screenshot({ path: `${SS}/${name}`, fullPage: false });
    console.log(`📸 ${name}`);
  }

  async function login(ctx, user = 'boss', pass = 'boss123') {
    const p = await ctx.newPage();
    ctx._page = p;
    p.on('pageerror', e => console.error('JS ERROR:', e.message));
    await p.goto('http://localhost:5173');
    await p.waitForSelector('.login-card', { timeout: 10000 });
    await p.fill('input[placeholder="Enter your username"]', user);
    await p.fill('input[placeholder="Enter your password"]', pass);
    await p.click('button[type="submit"]');
    await p.waitForSelector('.topbar-brand', { timeout: 15000 });
    await p.waitForTimeout(600);
    return p;
  }

  // Desktop
  const dCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const dp = await login(dCtx);
  await dp.screenshot({ path: `${SS}/desktop-dashboard.png` });
  console.log('📸 desktop-dashboard.png');

  for (const [label, name] of [
    ['Atrium Roster', 'desktop-atrium'],
    ['Cleanskin Roster', 'desktop-cleanskin'],
    ['Stock Orders', 'desktop-stock'],
    ['Menu', 'desktop-menu'],
    ['Recipes', 'desktop-recipes'],
    ['Staff Accounts', 'desktop-users'],
    ['Settings', 'desktop-settings'],
  ]) {
    await dp.click(`.nav-tab:has-text("${label}")`);
    await dp.waitForTimeout(900);
    await dp.screenshot({ path: `${SS}/${name}.png` });
    console.log(`📸 ${name}.png`);
  }
  await dCtx.close();

  // Mobile
  const mCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mp = await login(mCtx);
  await mp.screenshot({ path: `${SS}/mobile-dashboard.png` });
  console.log('📸 mobile-dashboard.png');

  await mp.click('.hamburger-btn');
  await mp.waitForTimeout(350);
  await mp.screenshot({ path: `${SS}/mobile-drawer.png` });
  console.log('📸 mobile-drawer.png');

  await mp.click('.drawer-item:has-text("Atrium Roster")');
  await mp.waitForTimeout(900);
  await mp.screenshot({ path: `${SS}/mobile-atrium.png` });
  console.log('📸 mobile-atrium.png');

  await mCtx.close();
  await browser.close();
  console.log(`\nAll screenshots saved to ${SS}/`);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
```

## Tabs to check

| Tab | URL trigger | Key things to verify |
|-----|-------------|----------------------|
| Dashboard | default after login | stat cards, today's roster (both stores) |
| Atrium Roster | nav tab | week nav, shift pills, TODAY badge, Publish button |
| Cleanskin Roster | nav tab | starts on current week (NOT Atrium's week) |
| Stock Orders | nav tab | Active/History tabs, All/Atrium/Cleanskin filter |
| Menu | nav tab | category filter, expandable cards, search |
| Recipes | nav tab | expandable cards with steps |
| Product Catalog | nav tab | grouped by category, Edit/Remove per item |
| Staff Accounts | nav tab | role badges, action buttons |
| Settings | nav tab | supplier email, WhatsApp, boss emails |

## Mobile checklist

- [ ] Login page: dark gradient background, brand logo above card
- [ ] Topbar: shows current tab label, hamburger ☰ visible, Sign out hidden
- [ ] Drawer: slides in from left, all tabs with icons, Sign out at bottom
- [ ] Dashboard: stores stack vertically, both visible
- [ ] Roster: shift pills wrap cleanly, TODAY badge visible

## Known quirks

- Render free tier cold start (~30s) — health ping fires on login page load to warm it
- Cleanskin roster showing wrong week = the `key` prop is missing on StoreRoster (fixed 2026-06-02)
- JWT expires after 7 days — auto-logout fires on next API call returning 401
- Render auto-deploy was disabled as of 2026-06-02 — trigger manually from dashboard if pushes don't deploy
