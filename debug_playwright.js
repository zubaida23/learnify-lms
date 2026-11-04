const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

  const studentSession = {
    access_token: 'fake-access-token',
    refresh_token: 'fake-refresh-token',
    expires_in: 3600,
    expires_at: 4102444800000,
    token_type: 'bearer',
    user: {
      id: 'student-123',
      email: 'student@example.com',
      app_metadata: { provider: 'email' },
      user_metadata: {},
      aud: 'authenticated',
      created_at: '2024-01-01T00:00:00Z',
    },
  };

  const course = {
    id: 'course-web-dev',
    title: 'intro to web development',
    description: 'Learn the fundamentals of building responsive web experiences.',
    short_description: 'Learn the fundamentals of building responsive web experiences.',
    thumbnail_url: '',
    status: 'published',
    is_published: true,
    created_at: '2024-04-01T00:00:00Z',
    slug: 'intro-to-web-development',
    level: 'beginner',
    price: 0,
    category: 'Development',
  };

  await page.addInitScript(({ tokenKey, session }) => {
    try {
      localStorage.setItem(tokenKey, JSON.stringify(session));
    } catch (e) {}
  }, { tokenKey: 'sb-igynhexmzzrkshlyepqj-auth-token', session: studentSession });

  await page.route('**/rest/v1/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/profiles')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'student-123', role: 'student' }]),
      });
    }
    if (url.includes('/courses')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([course]),
      });
    }
    if (url.includes('/enrollments')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    }
    return route.continue();
  });

  page.on('console', (msg) => console.log('BROWSER_CONSOLE', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.log('PAGEERROR', err.toString()));

  await page.goto('http://127.0.0.1:3000/courses', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(4000);

  console.log('FINAL_URL', page.url());
  console.log('BODY_TEXT', JSON.stringify((await page.locator('body').innerText()).slice(0, 4000)));
  const article = page.locator('article').filter({ hasText: 'intro to web development' }).first();
  console.log('ARTICLE_COUNT', await article.count());

  if ((await article.count()) > 0) {
    const text = await article.innerText();
    console.log('ARTICLE_TEXT', JSON.stringify(text.slice(0, 1500)));
    const button = article.locator('button').filter({ hasText: /Enroll|Enrolled/ }).first();
    console.log('BUTTON_COUNT', await button.count());

    if ((await button.count()) > 0) {
      const txt = await button.textContent();
      const style = await button.evaluate((el) => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const ancestors = [];
        let node = el.parentElement;
        while (node) {
          const p = getComputedStyle(node);
          ancestors.push({
            tag: node.tagName,
            className: node.className || '',
            display: p.display,
            visibility: p.visibility,
            opacity: p.opacity,
            overflow: p.overflow,
            overflowX: p.overflowX,
            overflowY: p.overflowY,
            width: p.width,
            height: p.height,
            position: p.position,
            zIndex: p.zIndex,
            rect: (() => {
              const rr = node.getBoundingClientRect();
              return { top: rr.top, left: rr.left, bottom: rr.bottom, right: rr.right, width: rr.width, height: rr.height };
            })(),
          });
          node = node.parentElement;
        }
        return {
          text: el.textContent,
          display: cs.display,
          visibility: cs.visibility,
          opacity: cs.opacity,
          color: cs.color,
          backgroundColor: cs.backgroundColor,
          width: cs.width,
          height: cs.height,
          top: r.top,
          left: r.left,
          bottom: r.bottom,
          right: r.right,
          rect: { x: r.x, y: r.y, width: r.width, height: r.height },
          ancestors,
        };
      });
      console.log('BUTTON_TEXT', JSON.stringify(txt));
      console.log('BUTTON_STYLE', JSON.stringify(style, null, 2));
    }
  }

  await browser.close();
})();
