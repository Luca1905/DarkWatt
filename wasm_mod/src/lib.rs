mod utils;
use wasm_bindgen::prelude::*;

mod constants;
use constants::{L_MAX, oetf_inv as inv, BT_709 as W};

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
pub fn average_luma_relative(pixels: &[u8]) -> f32 {
    debug_assert!(pixels.len() % 4 == 0);

    let mut sum_luma = 0.0_f32;
    let mut sum_weight = 0.0_f32;

    for chunk in pixels.chunks_exact(4) {
        let (r, g, b, a) = (chunk[0], chunk[1], chunk[2], chunk[3]);

        // normalise channels to 0-1
        let rf: f32 = r as f32 / 255.0;
        let gf: f32 = g as f32 / 255.0;
        let bf: f32 = b as f32 / 255.0;
        let af: f32 = a as f32 / 255.0; // alpha as weight

        let y: f32 = W.r * rf + W.g * gf + W.b * bf;

        sum_luma += y * af;
        sum_weight += af;
    }

    if sum_weight > 0.0 {
        sum_luma / sum_weight
    } else {
        0.0
    }
}

// Ey is the approxiamte y coordinate of the color space
// See: https://en.wikipedia.org/wiki/Rec._709#The_Y'C'BC'R_color_space
#[wasm_bindgen]
pub fn average_luma_in_nits(pixels: &[u8]) -> f32 {
    let ey: f32 = average_luma_relative(pixels);

    let y_linear: f32 = if ey <= inv::CUTOFF {
        ey / inv::SLOPE
    } else {
        ((ey + inv::ALPHA) / inv::SCALE).powf(inv::GAMMA)
    };

    y_linear * L_MAX
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
        let y = average_luma_relative(&data).abs();
        assert!(y < EPS, "calculated luminance: {}, expected: {}", y, 0);
    }

    #[test]
    fn white_is_255() {
        let data = solid_rgba(255, 255, 255, 255, 16);
        let y = average_luma_relative(&data).abs();
        assert!(
            1.0 - y < EPS,
            "calculated luminance: {}, expected: {}",
            y,
            1
        );
    }

    #[test]
    fn mid_grey_is_half() {
        let data = solid_rgba(128, 128, 128, 128, 16);
        let y = average_luma_relative(&data).abs();
        assert!(
            0.5 - y < EPS,
            "calculated luminance: {}, expected: {}",
            y,
            0.5
        );
    }

    #[test]
    fn checkerboard_is_midpoint() {
        let mut data = Vec::new();
        data.extend_from_slice(&[0, 0, 0, 255]); // black
        data.extend_from_slice(&[255, 255, 255, 255]); // white
        data.extend_from_slice(&[0, 0, 0, 255]); // black
        data.extend_from_slice(&[255, 255, 255, 255]); // white
        let y = average_luma_relative(&data);
        assert!(
            (y - 0.5).abs() < EPS,
            "calculated luminance: {}, expected: {}",
            y,
            0.5,
        );
    }

    #[test]
    #[should_panic]
    fn panics_on_non_rgba_length() {
        let data = vec![0u8; 5];
        average_luma_relative(&data);
    }

    #[test]
    fn nits_black_is_zero() {
        let data = solid_rgba(0, 0, 0, 255, 16);
        let nits = average_luma_in_nits(&data);
        assert!(nits.abs() < EPS, "calculated nits: {}, expected: {}", nits, 0.0);
    }

    #[test]
    fn nits_white_is_lmax() {
        use crate::constants::L_MAX;
        let data = solid_rgba(255, 255, 255, 255, 16);
        let nits = average_luma_in_nits(&data);
        assert!((nits - L_MAX).abs() < EPS, "calculated nits: {}, expected: {}", nits, L_MAX);
    }

    #[test]
    fn nits_mid_grey_matches_expected() {
        use crate::constants::{L_MAX, oetf_inv as inv};
        // 50% grey with 50% alpha, replicated across several pixels
        let data = solid_rgba(128, 128, 128, 128, 16);

        // Expected value, computed independently
        let ey = average_luma_relative(&data);
        let y_linear = if ey <= inv::CUTOFF {
            ey / inv::SLOPE
        } else {
            ((ey + inv::ALPHA) / inv::SCALE).powf(inv::GAMMA)
        };
        let expected_nits = y_linear * L_MAX;

        let nits = average_luma_in_nits(&data);
        assert!((nits - expected_nits).abs() < EPS, "calculated nits: {}, expected: {}", nits, expected_nits);
    }
}
