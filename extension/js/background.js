// A static import is required in b/g scripts because they are executed in their own env
// not connected to the content scripts where wasm is loaded automatically
import initWasmModule, { hello_wasm, greet } from './wasm/wasm_mod.js';

console.log("Background script started");

(async () => {
  await initWasmModule();
  hello_wasm();
  greet();
})();