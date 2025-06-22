mod utils;
use wasm_bindgen::prelude::*;
use web_sys::console;

mod constants;
use constants::{oetf_inv as inv, BT_709 as W, L_MAX};

mod pixel;
use pixel::Rgba;

use data_url::DataUrl;
use image::{imageops::FilterType, DynamicImage};

#[wasm_bindgen]
pub fn hello_wasm() {
    console::log_1(&"WASM LOADING COMPLETE".into());
}

#[wasm_bindgen]
pub fn average_luma_relative(pixels: &[u8]) -> f32 {
    debug_assert!(pixels.len() % 4 == 0);

    let mut sum_luma = 0.0_f32;
    let mut sum_weight = 0.0_f32;

    for chunk in pixels.chunks_exact(4) {
        let pixel = Rgba::from_slice(chunk);
        let (rf, gf, bf, af) = pixel.normalized();

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

#[wasm_bindgen]
pub fn average_luma_in_nits_from_data_uri(uri: &str) -> f32 {
    match process_data_uri(uri) {
        Ok(nits) => nits,
        Err(err) => {
            console::log_1(&format!("WASM: failed to process data URI: {}", err).into());
            0.0
        }
    }
}

fn process_data_uri(uri: &str) -> Result<f32, String> {
    // 1. Decode the data URI to bytes
    let bytes = decode_data_uri(uri)?;

    // 2. Decode to rgba values
    let img = image::load_from_memory(&bytes).map_err(|e| format!("image decode error: {}", e))?;

    // 3. Downscale
    let small = downscale_to_16(&img);

    Ok(average_luma_in_nits(&small))
}

fn decode_data_uri(uri: &str) -> Result<Vec<u8>, String> {
    let data_url = DataUrl::process(uri).map_err(|e| format!("invalid data URI: {}", e))?;

    let (bytes, _fragment) = data_url
        .decode_to_vec()
        .map_err(|e| format!("base64 decode error: {}", e))?;
    Ok(bytes)
}

fn downscale_to_16(img: &DynamicImage) -> Vec<u8> {
    let resized: DynamicImage = img.resize_exact(16, 16, FilterType::Triangle);
    resized.to_rgba8().into_raw()
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
        assert!(
            nits.abs() < EPS,
            "calculated nits: {}, expected: {}",
            nits,
            0.0
        );
    }

    #[test]
    fn nits_white_is_lmax() {
        use crate::constants::L_MAX;
        let data = solid_rgba(255, 255, 255, 255, 16);
        let nits = average_luma_in_nits(&data);
        assert!(
            (nits - L_MAX).abs() < EPS,
            "calculated nits: {}, expected: {}",
            nits,
            L_MAX
        );
    }

    #[test]
    fn nits_mid_grey_matches_expected() {
        use crate::constants::{oetf_inv as inv, L_MAX};
        // 50% grey with 50% alpha, replicated across several pixels
        let data: Vec<u8> = solid_rgba(128, 128, 128, 128, 16);

        // Expected value, computed independently
        let ey: f32 = average_luma_relative(&data);
        let y_linear: f32 = if ey <= inv::CUTOFF {
            ey / inv::SLOPE
        } else {
            ((ey + inv::ALPHA) / inv::SCALE).powf(inv::GAMMA)
        };
        let expected_nits: f32 = y_linear * L_MAX;

        let nits: f32 = average_luma_in_nits(&data);
        assert!(
            (nits - expected_nits).abs() < EPS,
            "calculated nits: {}, expected: {}",
            nits,
            expected_nits
        );
    }

    #[test]
    fn nits_from_data_uri_black_is_zero() {
        let data_uri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
        let nits = average_luma_in_nits_from_data_uri(data_uri);
        assert!(
            nits.abs() < EPS,
            "calculated nits: {}, expected: {}",
            nits,
            0.0
        );
    }
}
