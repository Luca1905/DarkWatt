mod utils;
use wasm_bindgen::prelude::*;

mod constants;
use constants::BT_709;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace=console)]
    fn log(s: &str);
}

#[wasm_bindgen]
pub fn hello_wasm() {
    log("WASM LOADING COMPLETE");
}

#[wasm_bindgen]
pub fn average_luminance(pixels: &[u8]) -> f32 {
    debug_assert!(pixels.len() % 4 == 0);

    let c = &BT_709;
    let mut acc: f32 = 0.0;

    for chunk in pixels.chunks_exact(4) {
        let r = chunk[0] as f32;
        let g = chunk[1] as f32;
        let b = chunk[2] as f32;
        acc += c.r * r + c.g * g + c.b * b;
    }

    let px = (pixels.len() / 4) as f32;
    acc / px
}

// Tests

#[cfg(test)]
mod tests {
    use super::*;

    const EPS: f32 = 1e-2;

    fn solid_rgba(r: u8, g: u8, b: u8, a: u8, count: usize) -> Vec<u8> {
        let mut v = Vec::with_capacity(4 * count);
        for _ in 0..count {
            v.extend_from_slice(&[r, g, b, a]);
        }
        v
    }

    #[test]
    fn black_is_zero() {
        let data = solid_rgba(0, 0, 0, 255, 16);
        assert!(average_luminance(&data).abs() < EPS);
    }

    #[test]
    fn white_is_255() {
        let data = solid_rgba(255, 255, 255, 255, 16);
        assert!((255.0 - average_luminance(&data)).abs() < EPS);
    }

    #[test]
    fn mid_grey_is_128() {
        let data = solid_rgba(128, 128, 128, 128, 16);
        assert!((128.0 - average_luminance(&data)).abs() < EPS);
    }

    #[test]
    fn checkerboard_is_midpoint() {
        let mut data = Vec::new();
        data.extend_from_slice(&[0, 0, 0, 255]); // black
        data.extend_from_slice(&[255, 255, 255, 255]); // white
        data.extend_from_slice(&[0, 0, 0, 255]); // black
        data.extend_from_slice(&[255, 255, 255, 255]); // white
        let y = average_luminance(&data);
        assert!((y - 127.5).abs() < EPS);
    }

    #[test]
    #[should_panic]
    fn panics_on_non_rgba_length() {
        let data = vec![0u8; 5];
        average_luminance(&data);
    }
}
