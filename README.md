# SportsAI broadcast sponsor overlay · v3

## Start on Mac or Windows

Install Node.js 18 or newer. Extract this ZIP, open a terminal in the extracted project folder (the one containing package.json), then run:

```sh
npm install
npm start
```

Open http://localhost:3000/broadcast.html for the **new banners and corner logos**.
Open http://localhost:3000/control.html for the original pool-perspective sponsor controls.

Use http://localhost:3000/overlay.html as a transparent browser source at **1920 × 1080**. For a different device on the same network, replace localhost with the server laptop's LAN IP address. Keep the laptop and server running. No video background is added to the output. The optional preview background is visible only on your control page.

## Sliding banner

1. Choose **Top sliding banner** and upload your 1280 × 128 PNG/JPG/WebP/GIF banners.
2. Set width (default 1280), top position (default 38 px, near the screenshot's top margin), visible time, wait interval, and animation duration.
3. Click **Apply settings**, then switch **Layer ON**.
4. Enable **Next banner after each interval** to play the playlist in order. Turn it off to repeat the selected banner.

The banner stays centred and uses a 10:1 box. Width is adjustable if you want a smaller banner like the screenshot. It slides from completely above the frame, eases to its stopping point, holds, then slides back up. The wait interval starts after it has left the screen. For example: 1.2 sec slide in + 10 sec hold + 1.2 sec slide out + 60 sec wait. **Restart timing / show now** starts the cycle again but does not enable a disabled layer or override master OFF. Changes to timing restart that layer's cycle. Position/width-only changes do not.

## Corner logos

Choose Top left, Top right, Bottom left, or Bottom right. Each corner has its own uploads, size, horizontal/vertical inset, on/off switch and timing.

- Rotation OFF: the selected logo stays visible.
- Rotation ON: fade in → hold for the visible time → fade out → optional blank gap → next logo.
- With one image, rotation ON fades that same image in and out repeatedly.
- Use transparent PNG/WebP for clean broadcast-style logos. Images fit inside a square without stretching.
- **Use first** chooses the playlist's starting image; arrows reorder and the checkbox includes/excludes an image. Up to 30 images per layer, 5 MB per uploaded file in the controller.

**All broadcast ads OFF** instantly hides the banner and four corner logos. **Restore enabled layers** restores the layers you previously enabled, at their current schedule positions. These switches do not affect the original pool-perspective image. Use **Hide** on the pool controller if you want only the new graphics; the original project's sample AURA pool image is enabled by default.

## Saving, hosting and access

New broadcast settings/playlists are saved in `data/broadcast.json`; uploads are saved in `data/uploads`. Keep this folder when moving/updating the project. Existing pool-perspective settings still behave as before and are kept in memory. The ZIP does not include test images.

Set `DATA_DIR` to a persistent writable directory when hosting. For hosting with an ephemeral filesystem, a restart/deployment may lose saved settings and uploads unless you attach persistent storage. If moving from an older installation, upload its old pool images again because old versions used temporary storage.

Optional `CONTROL_PIN` protects changes from both controllers; viewers can still open the output. Set it before starting the server, then enter it in either controller. Default port is 3000; `PORT` can override it.

Controllers and output use the same server state. Each output uses a server-aligned clock for animation. Reloaded outputs join the current schedule. Uploaded image failures are hidden instead of displaying a broken-image icon. Changes require a live server connection; the connection status appears at the top of the new controller.
