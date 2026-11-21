// Mobile: ☰ opens the full sidebar as a drawer; bottom bar "সব" too.
// Workspace name stays on one line. Runs after flow.mjs + seed2.sh.
import { chromium } from 'playwright'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
const BASE = 'http://localhost:3000'
const SHOTS = new URL('./shots-mobile', import.meta.url).pathname
fs.mkdirSync(SHOTS, { recursive: true })
let pass = 0, fail = 0
const ok = (n, c, d = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, d) }
const sql = (q) => execSync(`psql -h /var/tmp/cfpg -p 54329 -U postgres -d cfe2e -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim()
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' })
const errors = []
let dbg = null
async function login(ws, user, pw, viewport) {
  const p = await (await browser.newContext({ viewport, isMobile: viewport.width < 800, hasTouch: viewport.width < 800 })).newPage()
  p.on('pageerror', (e) => errors.push(String(e)))
  await p.goto(`${BASE}/login`)
  if (ws) { await p.click('button[role=tab]:has-text("Login ID")'); await p.fill('#workspace', ws); await p.fill('#loginId', user) }
  else await p.fill('#email', user)
  await p.fill('#password', pw)
  await p.click('form button[type=submit]')
  await p.waitForURL(/\/w\//)
  return p
}
const inView = (p) => p.$eval('#app-sidebar', (el) => { const r = el.getBoundingClientRect(); return getComputedStyle(el).visibility === 'visible' && r.right > 50 && r.left >= -1 })
const oldName = sql("select name from workspaces where slug='ecory'")
try {
  // A long workspace name to check the one-line rule.
  sql("update workspaces set name = 'Ecory Creative Production & Marketing Team Bangladesh' where slug='ecory'")
  const m = await login(null, 'owner@ecory-e2e.com', 'OwnerPass123', { width: 390, height: 844 }); dbg = m
  await m.goto(`${BASE}/w/ecory/dashboard`)
  await m.waitForSelector('.mobile-menu')
  ok('☰ visible on mobile', await m.isVisible('.mobile-menu'))
  ok('drawer closed at start', !(await inView(m)))
  await m.screenshot({ path: `${SHOTS}/01-mobile-closed.png` })
  await m.click('.mobile-menu')
  await m.waitForSelector('.sidebar.open')
  await m.waitForTimeout(350)
  ok('☰ opens the full sidebar', await inView(m))
  const links = await m.$$eval('#app-sidebar a', (x) => x.map((a) => a.getAttribute('href')))
  for (const k of ['dashboard', 'tasks', 'my-tasks', 'todo', 'learning', 'attendance', 'leave', 'team', 'settings', 'history', 'profile', 'projects'])
    ok(`drawer has ${k}`, links.some((h) => h === `/w/ecory/${k}`))
  ok('font size + colour moved out of the drawer', !(await m.$('#app-sidebar .display-ctl')))
  const ws = await m.$eval('.ws-text strong', (el) => ({ ws: getComputedStyle(el).whiteSpace, h: el.getBoundingClientRect().height, lh: parseFloat(getComputedStyle(el).lineHeight) || 18, cut: el.scrollWidth > el.clientWidth, title: el.title }))
  ok('workspace name on one line', ws.ws === 'nowrap' && ws.h < 30 && ws.cut, JSON.stringify(ws))
  ok('full name on hover (title)', ws.title.startsWith('Ecory Creative Production'))
  ok('page behind cannot scroll', await m.evaluate(() => document.body.style.overflow === 'hidden'))
  await m.screenshot({ path: `${SHOTS}/02-mobile-drawer.png` })
  // scroll inside the drawer to the bottom (settings / profile)
  await m.$eval('#app-sidebar', (el) => el.scrollTo(0, el.scrollHeight))
  await m.waitForTimeout(150)
  await m.screenshot({ path: `${SHOTS}/03-mobile-drawer-bottom.png` })
  // a link navigates and closes it
  await m.click('#app-sidebar a[href="/w/ecory/learning"]')
  await m.waitForURL('**/learning')
  await m.waitForTimeout(350)
  ok('link goes there and drawer closes', !(await inView(m)) && await m.evaluate(() => document.body.style.overflow !== 'hidden'))
  // Bottom bar: 4 shortcuts, no "সব"
  ok('bottom bar has no সব', !(await m.$('.mobile-nav .mobile-all')))
  const labels = await m.$$eval('.mobile-nav > a', (x) => x.map((a) => a.getAttribute('href')))
  ok('bottom bar = home, tasks, new, to-do', labels.length === 4 && labels[0].endsWith('/dashboard') && labels[1].endsWith('/tasks') && labels[2].includes('new=1') && labels[3].endsWith('/todo'), labels.join(','))
  await m.click('.mobile-menu')
  await m.waitForTimeout(350)
  ok('☰ opens the drawer again', await inView(m))
  await m.keyboard.press('Escape')
  await m.waitForTimeout(350)
  ok('Esc closes', !(await inView(m)))
  await m.click('.mobile-menu')
  await m.waitForTimeout(350)
  await m.mouse.click(370, 400) // backdrop, right of the drawer
  await m.waitForTimeout(350)
  ok('backdrop tap closes', !(await inView(m)))
  await m.click('.mobile-menu'); await m.waitForTimeout(300)
  await m.click('#app-sidebar .side-close'); await m.waitForTimeout(350)
  ok('✕ closes', !(await inView(m)))
  // Font size from the drawer works
  await m.click('.mobile-menu'); await m.waitForTimeout(300)
  const fsBtn = await m.$('#app-sidebar a[href$="/profile"]')
  ok('Profile (font size + colour) reachable from the drawer', Boolean(fsBtn))
  await m.keyboard.press('Escape')
  await m.screenshot({ path: `${SHOTS}/04-mobile-learning.png`, fullPage: false })
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  ok('no sideways scroll', overflow <= 1, String(overflow))

  // Employee on a small phone
  const e = await login('ecory', 'video001', 'NewEmpPass456', { width: 360, height: 760 })
  await e.goto(`${BASE}/w/ecory/dashboard`)
  await e.click('.mobile-menu'); await e.waitForTimeout(350)
  const elinks = await e.$$eval('#app-sidebar a', (x) => x.map((a) => a.getAttribute('href')))
  ok('employee drawer has to-do + learning', elinks.includes('/w/ecory/todo') && elinks.includes('/w/ecory/learning'))
  ok('employee drawer has no settings', !elinks.includes('/w/ecory/settings'))
  await e.screenshot({ path: `${SHOTS}/05-employee-drawer.png` })
  await e.keyboard.press('Escape')
  await e.waitForTimeout(400)
  await e.mouse.click(180, 300)
  const nav = await e.$$eval('.mobile-nav > *', (x) => x.map((el) => el.getBoundingClientRect().width))
  ok('bottom bar fits 360px', nav.every((w) => w >= 44) && nav.length === 4, nav.join(','))
  ok('employee ＋ adds own work', ((await e.getAttribute('.mobile-nav a:nth-child(3)', 'href')) || '').endsWith('/my-tasks?new=1'))
  await e.screenshot({ path: `${SHOTS}/06-employee-360.png` })

  // Desktop unchanged
  const d = await login(null, 'owner@ecory-e2e.com', 'OwnerPass123', { width: 1440, height: 900 })
  await d.goto(`${BASE}/w/ecory/dashboard`)
  ok('desktop: no ☰', !(await d.isVisible('.mobile-menu')))
  ok('desktop: sidebar shown', await d.isVisible('.sidebar .nav'))
  const dws = await d.$eval('.ws-text strong', (el) => ({ ws: getComputedStyle(el).whiteSpace, h: el.getBoundingClientRect().height }))
  ok('desktop: workspace name one line', dws.ws === 'nowrap' && dws.h < 30, JSON.stringify(dws))
  await d.screenshot({ path: `${SHOTS}/07-desktop.png`, clip: { x: 0, y: 0, width: 520, height: 300 } })

  ok('no client-side JS errors', errors.length === 0, errors.join(' | '))
} catch (e) { fail++; if (dbg) await dbg.screenshot({ path: `${SHOTS}/zz-error.png` }).catch(() => {}); console.log('ERROR', e.message.split('\n').slice(0, 8).join('\n')) }
sql(`update workspaces set name = '${oldName.replace(/'/g, "''")}' where slug='ecory'`)
console.log(`\n${pass} passed, ${fail} failed`)
await browser.close()
