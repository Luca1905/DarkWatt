import initWasmModule, { hello_wasm, average_luma_in_nits } from './wasm/wasm_mod.js';

async function init() {
  await initWasmModule();
  hello_wasm();

  //16 white pixels 
  const data = new Uint8Array(Array.from({ length: 16 }, () => [255, 255, 255, 255]).flat());
  console.log('Nits of white pixels:', average_luma_in_nits(data));
}

init();
