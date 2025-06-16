import initWasmModule, { hello_wasm } from './wasm/wasm_mod.js';

console.log("Background script started");
console.log(await chrome.permissions.getAll());

(async () => {
  await initWasmModule();
  hello_wasm();
})();
