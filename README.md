# DarkWatt

DarkWatt is a browser extension that helps you track the energy comsumption of your screen. It captures a down-scaled screenshot of the current tab (locally of course), computes the average luminance, and adds it with CPU usage statistics by the browser. The resulting data is persisted locally so you can find the sites that are the most battery-friendly.

## Features
* Real-time measurement of page luminance (in nits).
* Cross-browser packaging (Chromium & Firefox Nightly).
* Core pixel maths implemented in Rust + WebAssembly.

## Browser Support & Limitations

Firefox support is planned.

## Installation

### Prerequisites

* latest Chrome or Chromium Dev channel
* If you plan to build from source:
  * Rust ≥ 1.70
  * [`wasm-pack`](https://rustwasm.github.io/wasm-pack/)
  * A Bash-compatible shell (for `build.sh`)

### 1. Download a pre-built release (recommended)

Pre-built `.zip` packages are attached to every GitHub release.

1. Download the archive matching your browser.
2. Unzip it somewhere.
3. Open `chrome://extensions`.
4. Enable "Developer mode" and click "Load unpacked".
5. Select the extracted `build/` directory.

### 2. Build from source

```bash
# Clone and build the project
$ git clone https://github.com/Luca1905/darkwatt.git
$ cd darkwatt
$ ./build.sh       # compiles the WASM crate and creates the extension bundles
```

The script outputs one ready-to-load directories:

* `build/` – load this in Chromium based browsers.

## Usage

1. Load the extension as described above.
2. Pin the DarkWatt icon to the toolbar.
3. Browse as usual; open the popup anytime to see live luminance and accumulated energy data for the current website.

## Development

```bash
# Run Rust unit tests
$ cargo test -p wasm-mod

# Build only the WASM crate
$ wasm-pack build wasm_mod --dev --target web --out-dir ../extension/js/wasm --out-name wasm_mod
```

Press the reload button on `chrome://extensions` to pick up the changes.

## Testing
```bash
cargo test -p wasm-mod
```

## Project Structure

```
.
├── extension/          # WebExtension source (JS/HTML/CSS)
│   ├── js/             # background & popup scripts
│   └── assets/         # icons & images
├── wasm_mod/           # Rust crate compiled to WebAssembly
├── build.sh            # helper script to build and package the extension
└── media/              # project visuals (logo, screenshots)
```

## License

DarkWatt is released under the MIT License – see the [LICENSE](LICENSE) file for full text.

## Roadmap: from zero to a working DarkWatt demo

- [x] git repo
- [x] set up wasm and extension structure
- [x] manifest
- [x] working demo
  
- [x] UI scaffhold
- [x] Luminenance logic
- [x] tests
- [x] integrate into js, test using mock data

- [x] screenshot current tab and draw to smaller canvas
- [x] implement background service for handling luma data
  - [x] create a dxdb in background
  - [x] set up message connections to get and save luma data
  - [ ] implement savings logic
    - [x] heuristic function for light mode page into dark mode page
    - [x] heuristic function for detecting light e.g. dark mode page
        - [ ] cache seen sites, known parameter
        - [ ] render onChange
    - [ ] calculating energy saving from nits saved.
    - [x] get display size for energy calculation
- [x] store data in dxdb, expose to popup
  - [x] use chrome storage instead
    - [x] move data querying from storage directly to UI

- [x] remove annoying errors on installation
  - [x] error when on chrome://
  - [x] exceeding MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND
- [ ] set up proper testing environment | [example](https://github.com/darkreader/darkreader/tree/main) , [karma](https://karma-runner.github.io/latest/index.html)

### Popup:
- [x] get data from background
- [x] render data in UI
  - [x] render most current data
  - [x] render total tracked sites
  - [ ] render savings
  - [ ] listen to storage API changes | [see here](https://developer.chrome.com/docs/extensions/reference/api/storage#use-cases)
- [ ] settings page for custom values
- [ ] analytics page
- [ ] enable sample on demand

- [ ] port background to web_sys using wasm
- [ ] firefox integration
- [ ] deploy


- [ ] fix assumptions (config)
  - [ ] assumed screen max brightness

### DX:
- [ ] make messaging typesafe | [example](https://github.com/darkreader/darkreader/blob/main/src/background/messenger.ts)

### BUGS:
- [x] content script: youtube not detected as light
- [x] popup: chart x-axis wrong, too much data
- [ ] ui: chart not loading new changes
- [x] Error handling response: TypeError: Cannot destructure property 'data' of 'object null' as it is null.
- [x] Uncaught (in promise) Error: Could not establish connection. Receiving end does not exist.
- [ ] Permission error in devtools, chrome://, fix in tab utils file.
