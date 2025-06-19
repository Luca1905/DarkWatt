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

### Popup:
- [x] get data from background
- [ ] render data in UI
  - [x] render most current data
  - [x] render total tracked sites
  - [ ] render savings
- [ ] settings page for custom values
- [ ] analytics page

- [ ] firefox integration
- [ ] deploy
