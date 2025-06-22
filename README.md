# TODO

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
- [ ] get CPU usage data
- [x] store data in dxdb, expose to popup

- [ ] remove annoying errors on installation
  - [ ] error when on chrome://
  - [ ] exceeding MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND
### Popup:
- [x] get data from background
- [x] render data in UI
  - [x] render most current data
  - [x] render total tracked sites
  - [ ] render savings
- [ ] settings page for custom values
- [ ] analytics page

- [ ] port background to web_sys using wasm
- [ ] firefox integration
- [ ] deploy


Important note: this extension uses a Chrome experimental feature to monitor the cpu usage, and thus is only available with the Chrome dev release.

Chrome dev release could be downloaded and installed here: https://www.chromium.org/getting-involved/dev-channel

The processes API is documented here: https://developer.chrome.com/extensions/processes
