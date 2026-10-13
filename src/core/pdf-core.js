const _ = require('lodash');
const config = require('../config');
const logger = require('../util/logger')(__filename);

let puppeteerPromise;
function getPuppeteer() {
  if (!puppeteerPromise) {
    // Dynamic import to support both ESM and CommonJS in older Node versions (Node 18)
    // eslint-disable-next-line no-new-func
    const importPuppeteer = new Function('return import("puppeteer")');
    puppeteerPromise = importPuppeteer().then(m => m.default || m);
  }
  return puppeteerPromise;
}

async function render(_opts = {}) {
  const opts = _.merge({
    cookies: [],
    scrollPage: false,
    emulateScreenMedia: true,
    ignoreHttpsErrors: false,
    html: null,
    viewport: {
      width: 1600,
      height: 1200,
    },
    goto: {
      waitUntil: 'networkidle2',
    },
    pdf: {
      format: 'A4',
      printBackground: true,
    },
  }, _opts);

  if (opts.goto && opts.goto.waitUntil === 'networkidle') {
    opts.goto.waitUntil = 'networkidle2';
  }

  const cleanGotoOpts = _.pick(opts.goto, ['timeout', 'waitUntil', 'referer']);

  if (_.get(_opts, 'pdf.width') && _.get(_opts, 'pdf.height')) {
    // pdf.format always overrides width and height, so we must delete it
    // when user explicitly wants to set width and height
    opts.pdf.format = undefined;
  }

  logOpts(opts);

  const launchArgs = [
    '--disable-gpu',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
  ];

  const launchOpts = {
    headless: !config.DEBUG_MODE,
    acceptInsecureCerts: opts.ignoreHttpsErrors,
    ignoreHTTPSErrors: opts.ignoreHttpsErrors,
    args: launchArgs,
    sloMo: config.DEBUG_MODE ? 250 : undefined,
  };

  if (config.PUPPETEER_EXECUTABLE_PATH) {
    launchOpts.executablePath = config.PUPPETEER_EXECUTABLE_PATH;
  }

  const puppeteer = await getPuppeteer();
  const browser = await puppeteer.launch(launchOpts);
  const page = await browser.newPage();

  page.on('console', (...args) => logger.info('PAGE LOG:', ...args));

  page.on('error', (err) => {
    logger.error(`Error event emitted: ${err}`);
    logger.error(err.stack);
    browser.close();
  });

  let data;
  try {
    logger.info('Set browser viewport..');
    await page.setViewport(opts.viewport);
    if (opts.emulateScreenMedia) {
      logger.info('Emulate @media screen..');
      await page.emulateMediaType('screen');
    }

    if (opts.cookies && opts.cookies.length > 0) {
      logger.info('Setting cookies..');
      await page.setCookie(...opts.cookies);
    }

    if (opts.html) {
      logger.info('Set HTML ..');
      await page.setContent(opts.html, cleanGotoOpts);
    } else {
      logger.info(`Goto url ${opts.url} ..`);
      await page.goto(opts.url, cleanGotoOpts);
    }

    if (_.isNumber(opts.waitFor)) {
      logger.info(`Wait for ${opts.waitFor} ms..`);
      await new Promise(resolve => setTimeout(resolve, opts.waitFor));
    } else if (_.isString(opts.waitFor)) {
      logger.info(`Wait for selector ${opts.waitFor} ..`);
      await page.waitForSelector(opts.waitFor);
    }

    if (opts.scrollPage) {
      logger.info('Scroll page ..');
      await scrollPage(page);
    }

    logger.info('Render PDF ..');
    if (config.DEBUG_MODE) {
      const msg = `\n\n---------------------------------\n
        Chrome does not support PDF rendering in "headed" mode.
        See this issue: https://github.com/GoogleChrome/puppeteer/issues/576
        \n---------------------------------\n\n
      `;
      throw new Error(msg);
    }

    const pdfBuffer = await page.pdf(opts.pdf);
    data = Buffer.from(pdfBuffer);
  } catch (err) {
    logger.error(`Error when rendering page: ${err}`);
    logger.error(err.stack);
    throw err;
  } finally {
    logger.info('Closing browser..');
    if (!config.DEBUG_MODE) {
      await browser.close();
    }
  }

  return data;
}

async function scrollPage(page) {
  // Scroll to page end to trigger lazy loading elements
  await page.evaluate(() => {
    const scrollInterval = 100;
    const scrollStep = Math.floor(window.innerHeight / 2);
    const bottomThreshold = 400;

    function bottomPos() {
      return window.pageYOffset + window.innerHeight;
    }

    return new Promise((resolve, reject) => {
      function scrollDown() {
        window.scrollBy(0, scrollStep);

        if (document.body.scrollHeight - bottomPos() < bottomThreshold) {
          window.scrollTo(0, 0);
          setTimeout(resolve, 500);
          return;
        }

        setTimeout(scrollDown, scrollInterval);
      }

      setTimeout(reject, 30000);
      scrollDown();
    });
  });
}

function logOpts(opts) {
  const supressedOpts = _.cloneDeep(opts);
  if (opts.html) {
    supressedOpts.html = '...';
  }

  logger.info(`Rendering with opts: ${JSON.stringify(supressedOpts, null, 2)}`);
}

module.exports = {
  render,
};
