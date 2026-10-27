# URL to PDF Microservice

> Web page PDF rendering done right. Microservice for rendering receipts, invoices, or any web content as PDF. Packaged into a simple API.

![Logo](docs/logo.png)

> **Notice / Fork Information:**  
> This project is a modernized fork of [alvarcarto/url-to-pdf-api](https://github.com/alvarcarto/url-to-pdf-api) (originally created by Kimmo Brunfeldt). Because the original repository is no longer maintained, this fork upgrades the entire stack to Node.js 18+ and modern Puppeteer (Chromium), adds support for system-installed Chromium (Debian/Ubuntu), provides robust reverse-proxy support (Apache / Nginx), and fixes deprecated APIs and dependencies.

**WARNING:** *Don't serve this API publicly to the internet unless you are aware of the
risks. It allows API users to run any JavaScript code inside a Chrome session on the server.
It's fairly easy to expose the contents of files on the server. You have been warned!*

**⭐️ Features:**

* Converts any URL or HTML content to a PDF file
* Rendered with modern Headless Chrome / Chromium, using [Puppeteer](https://pptr.dev/). The PDFs match desktop Chrome output.
* Sensible defaults but everything is configurable (margins, formats, viewport, scale, header/footer).
* Single-page app (SPA) support. Waits until network requests are finished (`networkidle2`) before rendering.
* Renders lazy loaded elements (`scrollPage` option).
* Supports optional `x-api-key` authentication (`API_TOKENS` env var).
* Supports system Chromium via `PUPPETEER_EXECUTABLE_PATH`.
* Full reverse-proxy compatibility (Apache, Nginx).

Usage: `GET http://localhost:9000/api/render?url=https://google.com`. There's also `POST /api/render` to send options or HTML in the body.

**🔍 Why?**

This microservice is useful when you need to automatically produce PDF files
for whatever reason. The files could be receipts, weekly reports, invoices,
or any content.

PDFs can be generated in many ways, but one of them is to convert HTML+CSS
content to a PDF. This API does just that.

**🚀 Shortcuts:**

* [Examples](#examples)
* [API](#api)
* [Installation & Deployment](#installation--deployment)

## Good to know

* **By default, page's `@media print` CSS rules are ignored**. We set Chrome to emulate `@media screen` to make the default PDFs look more like actual sites. To get results closer to desktop Chrome, add `&emulateScreenMedia=false` query parameter. See more at [Puppeteer API docs](https://pptr.dev/).

* Chrome is launched with `--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage` flags.

* Heavy pages may cause Chrome to crash if the server doesn't have enough RAM.


## Examples

**Use the default @media print instead of @media screen:**

```bash
curl -o page.pdf "http://localhost:9000/api/render?url=https://example.com&emulateScreenMedia=false"
```

**Use scrollPage=true to reveal lazy loaded elements:**

```bash
curl -o page.pdf "http://localhost:9000/api/render?url=https://example.com&scrollPage=true"
```

**Render only the first page:**

```bash
curl -o page.pdf "http://localhost:9000/api/render?url=https://example.com&pdf.pageRanges=1"
```

**Render A5-sized PDF in landscape:**

```bash
curl -o page.pdf "http://localhost:9000/api/render?url=https://example.com&pdf.format=A5&pdf.landscape=true"
```

**Add 2cm margins to the PDF:**

```bash
curl -o page.pdf "http://localhost:9000/api/render?url=https://example.com&pdf.margin.top=2cm&pdf.margin.right=2cm&pdf.margin.bottom=2cm&pdf.margin.left=2cm"
```

**Wait for extra 1000ms before render:**

```bash
curl -o page.pdf "http://localhost:9000/api/render?url=https://example.com&waitFor=1000"
```

**Wait for an element matching selector `input` to appear:**

```bash
curl -o page.pdf "http://localhost:9000/api/render?url=https://example.com&waitFor=input"
```

**Render HTML sent in JSON body:**

```bash
curl -o html.pdf -XPOST -d'{"html": "<body><h1>Hello</h1></body>"}' -H"content-type: application/json" http://localhost:9000/api/render
```

**Render HTML sent as text body:**

```bash
curl -o html.pdf -XPOST -d@page.html -H"content-type: text/html" http://localhost:9000/api/render
```

## API

To understand the API options, it's useful to know how [Puppeteer](https://pptr.dev/)
is internally used by this API. Render flow:

1. **`page.setViewport(options)`** where options match `viewport.*`.
2. **`page.emulateMediaType('screen')`** if `emulateScreenMedia=true` (default).
3. Render url **or** html via **`page.goto(url)`** or **`page.setContent(html)`**.
4. *Possibly* **`page.waitForSelector()`** or timeout if `waitFor` is set.
5. *Possibly* **Scroll the whole page** to the end before rendering if `scrollPage=true` is set.
6. **`page.pdf(options)`** where options match `pdf.*`.


### GET /api/render

All options are passed as query parameters.
Parameter names match Puppeteer options with dot notation (e.g. `?pdf.scale=2` instead of `{ pdf: { scale: 2 }}`).

The only required parameter is `url`.

Parameter | Type | Default | Description
----------|------|---------|------------
url | string | - | URL to render as PDF. (required)
emulateScreenMedia | boolean | `true` | Emulates `@media screen` when rendering the PDF.
ignoreHttpsErrors | boolean | `false` | Ignores possible HTTPS errors when navigating to a page.
scrollPage | boolean | `false` | Scroll page down before rendering to trigger lazy loading elements.
waitFor | number or string | - | Number in ms to wait before render or selector element to wait before render.
viewport.width | number | `1600` | Viewport width.
viewport.height | number | `1200` | Viewport height.
viewport.deviceScaleFactor | number | `1` | Device scale factor (could be thought of as dpr).
viewport.isMobile | boolean | `false` | Whether the meta viewport tag is taken into account.
viewport.hasTouch | boolean | `false` | Specifies if viewport supports touch events.
viewport.isLandscape | boolean | `false` | Specifies if viewport is in landscape mode.
cookies[0][name] | string | - | Cookie name (required)
cookies[0][value] | string | - | Cookie value (required)
cookies[0][url] | string | - | Cookie url
cookies[0][domain] | string | - | Cookie domain
cookies[0][path] | string | - | Cookie path
cookies[0][expires] | number | - | Cookie expiry in unix time
cookies[0][httpOnly] | boolean | - | Cookie httpOnly
cookies[0][secure] | boolean | - | Cookie secure
cookies[0][sameSite] | string | - | `Strict` or `Lax`
goto.timeout | number | `30000` | Maximum navigation time in milliseconds (0 to disable).
goto.waitUntil | string | `networkidle2` | When to consider navigation succeeded (`load`, `domcontentloaded`, `networkidle0`, `networkidle2`).
pdf.scale | number | `1` | Scale of the webpage rendering.
pdf.printBackground | boolean | `true` | Print background graphics.
pdf.displayHeaderFooter | boolean | `false` | Display header and footer.
pdf.landscape | boolean | `false` | Paper orientation.
pdf.pageRanges | string | - | Paper ranges to print, e.g., '1-5, 8, 11-13'.
pdf.format | string | `A4` | Paper format. If set, takes priority over width or height.
pdf.width | string | - | Paper width, accepts values labeled with units (e.g. `210mm`).
pdf.height | string | - | Paper height, accepts values labeled with units (e.g. `297mm`).
pdf.margin.top | string | - | Top margin with unit (e.g. `2cm`).
pdf.margin.right | string | - | Right margin with unit.
pdf.margin.bottom | string | - | Bottom margin with unit.
pdf.margin.left | string | - | Left margin with unit.


### POST /api/render - (JSON)

All options are passed in a JSON body object.

**Body**

The only required parameter is `url` (or `html`).

```json
{
  "url": "https://example.com",
  "emulateScreenMedia": true,
  "ignoreHttpsErrors": false,
  "scrollPage": false,
  "waitFor": null,
  "cookies": [],
  "viewport": {
    "width": 1600,
    "height": 1200
  },
  "goto": {
    "waitUntil": "networkidle2"
  },
  "pdf": {
    "format": "A4",
    "printBackground": true
  }
}
```

### POST /api/render - (HTML)

HTML to render is sent in body (`Content-Type: text/html`). All options are passed in query parameters.

```bash
curl -o page.pdf -XPOST -d@receipt.html -H"content-type: text/html" "http://localhost:9000/api/render?pdf.scale=1"
```

---

## Installation & Deployment

### 1. Requirements

* **Node.js**: 18.x or higher (Node 18, 20, 22+)
* **Debian / Ubuntu** Linux (or macOS)

### 2. Install Required Debian / Ubuntu Packages

Running Headless Chrome / Chromium on a Debian/Ubuntu server requires specific packages. You can choose either **Option A** (recommended) or **Option B**:

#### Option A: Use Debian's Chromium Package (Recommended)

Installing the distribution's `chromium` package automatically pulls in all required shared libraries and fonts, and receives security updates via `apt`:

```bash
sudo apt update
sudo apt install -y \
  chromium \
  fonts-liberation \
  fonts-noto-color-emoji
```

After installation, verify the binary location:
```bash
which chromium
# Output: /usr/bin/chromium
```
Then configure `export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium` in your `.env` file (see Step 4).

#### Option B: Use Puppeteer's Bundled Chrome

If you prefer using Puppeteer's downloaded Chrome build instead of the Debian package, install the required system libraries manually:

```bash
sudo apt update
sudo apt install -y \
  ca-certificates \
  fonts-liberation \
  fonts-noto-color-emoji \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libc6 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libdrm2 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  xdg-utils
```

*(Note for Debian 12 / Bookworm: `libasound2t64` or `libasound2` is resolved automatically by `apt`)*

Alternatively, Puppeteer provides an automatic installer command that detects your Linux distribution and installs missing packages:
```bash
npx puppeteer browsers install chrome --install-deps
```

### 3. Setup Project

```bash
git clone https://github.com/napium/url-to-pdf-api.git
cd url-to-pdf-api
npm install --omit=dev
```

### 4. Configuration (.env)

Copy `.env.sample` to `.env`:

```bash
cp .env.sample .env
```

Set your configuration:

```bash
export NODE_ENV=production
export PORT=9000
export ALLOW_HTTP=true

# If using Debian's Chromium:
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Optional: Require x-api-key header for authentication
# export API_TOKENS=secret1,secret2
```

### 5. Start the Server

```bash
# Start with environment variables:
source .env && npm start

# Or for development with nodemon:
source .env && npm run dev
```

### 6. Reverse Proxy Setup (Apache & Nginx)

#### Apache Configuration

Enable the required Apache modules:
```bash
sudo a2enmod proxy proxy_http headers
```

Add the following to your SSL VirtualHost configuration (`<VirtualHost *:443>` block):
```apache
# PDF Engine Reverse Proxy
RequestHeader set X-Forwarded-Proto "https"
ProxyPass /pdfengine/ http://127.0.0.1:9000/
ProxyPassReverse /pdfengine/ http://127.0.0.1:9000/
ProxyTimeout 1200
```

Reload Apache:
```bash
sudo systemctl reload apache2
```

#### Nginx Configuration

Add a `location` block inside your `server { listen 443 ssl; ... }` block:

```nginx
# PDF Engine Reverse Proxy
location /pdfengine/ {
    proxy_pass http://127.0.0.1:9000/;
    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;

    # Timeouts for heavy PDF generation jobs
    proxy_connect_timeout 60s;
    proxy_send_timeout 1200s;
    proxy_read_timeout 1200s;

    # Allow larger payloads when sending HTML body directly
    client_max_body_size 10M;
}
```

Test and reload Nginx:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

### 7. API Authentication (API Tokens)

By default, the API has no authentication enabled. If you want to protect the endpoint:

1. Define one or more secret tokens in `.env` as a comma-separated list:
   ```bash
   export API_TOKENS=my-secret-token-1,my-secret-token-2
   ```

2. When `API_TOKENS` is set, all incoming requests **must** provide the token in the `x-api-key` header, otherwise the API returns `401 Unauthorized`:

   **Using curl (GET):**
   ```bash
   curl -H "x-api-key: my-secret-token-1" \
     "https://your-domain.com/pdfengine/api/render?url=https://example.com" \
     -o output.pdf
   ```

   **Using curl (POST JSON):**
   ```bash
   curl -X POST "https://your-domain.com/pdfengine/api/render" \
     -H "x-api-key: my-secret-token-1" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://example.com"}' \
     -o output.pdf
   ```

### 8. Optional: Systemd Service (Autostart)

Create `/etc/systemd/system/pdf-engine.service`:

```ini
[Unit]
Description=URL to PDF API
After=network.target

[Service]
Type=simple
User=rene
WorkingDirectory=/home/NodeJS/url-to-pdf-api
EnvironmentFile=/home/NodeJS/url-to-pdf-api/.env
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now pdf-engine
```

---

## Techstack

* Node 22.12+ (LTS)
* [Express.js](https://expressjs.com/)
* [Puppeteer](https://pptr.dev/) to control Headless Chrome / Chromium
* [Joi](https://joi.dev/)

## License

MIT © [René Gehmeyer](https://github.com/napium) (Fork)  
Original work © 2017 Kimmo Brunfeldt ([alvarcarto/url-to-pdf-api](https://github.com/alvarcarto/url-to-pdf-api))
