# Local ChatGPT Image MCP

A local MCP server that uses an existing persistent Playwright browser profile to generate an image in ChatGPT, saves the image locally, uploads it to ImgBB, and records each request in SQLite. A minimal local admin panel shows request history.

## Requirements

- Node.js 26 supported (uses the built-in `node:sqlite` module; no native SQLite addon compilation required)
- Google Chrome installed
- An existing Playwright persistent profile that is signed in to ChatGPT
- ImgBB API key

## Install

```bash
npm install
copy .env.example .env
```

Edit `.env`:
- `IMGBB_API_KEY`: your ImgBB API key (obtain from https://api.imgbb.com)
- `PROFILE_DIR`: the absolute path to your persistent Chrome profile directory signed into ChatGPT
- Adjust `CHROME_PATH` only if the Chrome executable is not detected automatically.

Example:

```env
PROFILE_DIR=C:\Users\username\chatgpt-profile
```

> [!NOTE]
> Chrome locks persistent profiles while active. Close any open Chrome sessions using this profile directory before starting the MCP server. Do not delete profile lock files while Chrome is running.

## Start

```bash
npm start
```

The MCP server uses Streamable HTTP on the same port as the admin panel.

- MCP endpoint: `http://127.0.0.1:4580/mcp`
- Admin panel: `http://127.0.0.1:4580`
- Request history API: `http://127.0.0.1:4580/api/requests`

The SQLite database defaults to `data/image-history.sqlite`; generated images default to `generated/`.

## Connect an MCP client

Configure your MCP client to use the HTTP URL directly; no local JavaScript file path is required in the client configuration.

```json
{
  "mcpServers": {
    "local-chatgpt-image-mcp": {
      "url": "http://127.0.0.1:4580/mcp"
    }
  }
}
```

The exact configuration field can vary by MCP client. For MCP Inspector, choose Streamable HTTP and enter `http://127.0.0.1:4580/mcp` as the URL.

## Integration with Daily Build Blogs

To connect this MCP server to your Daily Build Blogs instance:

1. Start `local-image-mcp` on your machine (`npm start`).
2. If Daily Build Blogs is hosted remotely, create a secure public tunnel via ngrok:
   ```bash
   ngrok http 4580
   ```
3. In Daily Build Blogs **Admin CMS -> AI Providers & MCP Images**:
   - In the **Local Image MCP & External Agent** card, enter your endpoint URL in the **MCP Image Server Endpoint** field (e.g., `https://your-tunnel.ngrok-free.dev` or `http://localhost:4580`).
   - The backend automatically resolves `${origin}/mcp` directly after the domain name and extension.
   - Click **Test MCP** to execute a live handshake and verify tool detection.
   - In **Featured Image Settings**, set your preferred engine to **Model Context Protocol (MCP)**.
   - In the Visual Workflow Builder, image nodes can now use MCP for automatic synthesis.

## Tool

`generate_and_upload_image({ "prompt": "..." })`

Returns the request ID, ImgBB URL, local image path, file size, and elapsed time. Both successful and failed attempts are stored in SQLite.

## Important notes

- This project reuses the profile path you configure; it does not copy your browser cookies or create a separate profile.
- Browser selectors and ChatGPT UI behavior can change. If generation detection fails, inspect `src/browser.js` and update the selectors/image-source detection.
- Keep `.env`, the browser profile, SQLite database, and generated images private.
- The service binds to `127.0.0.1` by default and is not exposed to the network. Both the admin panel and MCP endpoint use port `4580`.
- ImgBB is an external host; uploaded images may be publicly accessible through the returned URL.
