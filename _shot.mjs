import { chromium } from 'playwright';
const url = 'http://localhost:4188/';
const b = await chromium.launch();
for (const [name, w, h] of [['desktop',1440,900],['mobile',390,844]]) {
  const ctx = await b.newContext({ viewport:{width:w,height:h}, deviceScaleFactor:1 });
  const page = await ctx.newPage();
  await page.goto(url, {waitUntil:'networkidle'});
  await page.waitForTimeout(700);
  await page.screenshot({path:'logs/baseline-' + name + '.png', fullPage:true});
  await ctx.close();
}
await b.close();
console.log('shots done');
