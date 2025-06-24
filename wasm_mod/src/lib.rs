mod utils;
use wasm_bindgen::prelude::*;
use web_sys::console;

mod constants;
use constants::{oetf as fwd, oetf_inv as inv, BT_709 as W, L_MAX};

mod pixel;
use pixel::Rgba;

use data_url::DataUrl;
use image::{imageops::FilterType, DynamicImage};

#[wasm_bindgen]
pub fn hello_wasm() {
    console::log_1(&"[WASM] LOADING COMPLETE".into());
}

#[wasm_bindgen]
pub fn average_luma_relative(pixels: &[u8]) -> f32 {
    debug_assert!(pixels.len() % 4 == 0);

    let mut sum_luma = 0.0_f32;
    let mut sum_weight = 0.0_f32;

    for chunk in pixels.chunks_exact(4) {
        let pixel = Rgba::from_slice(chunk);
        let (rf, gf, bf, af) = pixel.normalized();

        let y: f32 = W.r.mul_add(rf, W.g.mul_add(gf, W.b * bf));

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
            console::log_1(&format!("[WASM] failed to process data URI: {}", err).into());
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

#[wasm_bindgen]
pub fn convert_rgba_to_dark_mode(pixels: &[u8]) -> Vec<u8> {
    debug_assert!(pixels.len() % 4 == 0);

    let mut result = Vec::with_capacity(pixels.len());

    for chunk in pixels.chunks_exact(4) {
        let pixel = Rgba::from_slice(chunk);
        let dark_pixel = convert_pixel_to_dark_mode(&pixel);
        result.extend_from_slice(&[dark_pixel.r, dark_pixel.g, dark_pixel.b, dark_pixel.a]);
    }

    result
}

fn convert_pixel_to_dark_mode(pixel: &Rgba) -> Rgba {
    let (rf, gf, bf, af) = pixel.normalized(); // 0-1

    // transparent pixels are skipped
    if af < 0.01 {
        return *pixel;
    }

    let (r_linear, g_linear, b_linear) = srgb_to_linear(rf, gf, bf);
    let (r_dark, g_dark, b_dark) = apply_dark_mode_transform(r_linear, g_linear, b_linear);
    let (r_srgb, g_srgb, b_srgb) = linear_to_srgb(r_dark, g_dark, b_dark);

    Rgba {
        r: (r_srgb * 255.0).round().clamp(0.0, 255.0) as u8,
        g: (g_srgb * 255.0).round().clamp(0.0, 255.0) as u8,
        b: (b_srgb * 255.0).round().clamp(0.0, 255.0) as u8,
        a: pixel.a,
    }
}

#[inline]
fn srgb_to_linear(r: f32, g: f32, b: f32) -> (f32, f32, f32) {
    #[inline]
    fn comp(c: f32) -> f32 {
        if c <= inv::CUTOFF {
            c / inv::SLOPE
        } else {
            ((c + inv::ALPHA) / inv::SCALE).powf(inv::GAMMA)
        }
    }
    (comp(r), comp(g), comp(b))
}

#[inline]
fn linear_to_srgb(r: f32, g: f32, b: f32) -> (f32, f32, f32) {
    #[inline]
    fn comp(c: f32) -> f32 {
        if c <= fwd::CUTOFF {
            c * fwd::SLOPE
        } else {
            fwd::SCALE * c.powf(1.0 / fwd::GAMMA) - fwd::ALPHA
        }
    }
    (comp(r), comp(g), comp(b))
}

fn apply_dark_mode_transform(r: f32, g: f32, b: f32) -> (f32, f32, f32) {
    let luma = W.r.mul_add(r, W.g.mul_add(g, W.b * b));
    if luma < 0.05 {
        return (1.0, 1.0, 1.0);
    }

    let inv_luma = 1.0 - luma;
    let scale = if luma > 0.0 { inv_luma / luma } else { 1.0 };
    let r_new = (r * scale).clamp(0.0, 1.0);
    let g_new = (g * scale).clamp(0.0, 1.0);
    let b_new = (b * scale).clamp(0.0, 1.0);
    (r_new, g_new, b_new)
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

    #[test]
    fn dark_mode_converts_white_background_to_dark() {
        let data = solid_rgba(255, 255, 255, 255, 16); // White background
        let dark_data = convert_rgba_to_dark_mode(&data);

        // Check that the first pixel is now dark
        let dark_pixel = Rgba::from_slice(&dark_data[0..4]);
        let (rf, gf, bf, _) = dark_pixel.normalized();

        // Should be dark (low values)
        assert!(rf < 0.2, "Expected dark red, got {}", rf);
        assert!(gf < 0.2, "Expected dark green, got {}", gf);
        assert!(bf < 0.2, "Expected dark blue, got {}", bf);
    }

    #[test]
    fn dark_mode_converts_black_text_to_bright() {
        let data = solid_rgba(0, 0, 0, 255, 16); // Black text
        let dark_data = convert_rgba_to_dark_mode(&data);

        // Check that the first pixel is now bright
        let dark_pixel = Rgba::from_slice(&dark_data[0..4]);
        let (rf, gf, bf, _) = dark_pixel.normalized();

        // Should be bright (high values)
        assert!(rf > 0.7, "Expected bright red, got {}", rf);
        assert!(gf > 0.7, "Expected bright green, got {}", gf);
        assert!(bf > 0.7, "Expected bright blue, got {}", bf);
    }

    #[test]
    fn dark_mode_preserves_alpha() {
        let data = solid_rgba(128, 128, 128, 100, 16); // Grey with alpha
        let dark_data = convert_rgba_to_dark_mode(&data);

        // Check that alpha is preserved
        for i in 0..16 {
            let original_alpha = data[i * 4 + 3];
            let converted_alpha = dark_data[i * 4 + 3];
            assert_eq!(original_alpha, converted_alpha, "Alpha should be preserved");
        }
    }

    #[test]
    fn dark_mode_handles_transparent_pixels() {
        let data = solid_rgba(255, 255, 255, 0, 16); // Transparent white
        let dark_data = convert_rgba_to_dark_mode(&data);

        // Transparent pixels should remain unchanged
        assert_eq!(
            data, dark_data,
            "Transparent pixels should remain unchanged"
        );
    }

    #[test]
    fn dark_mode_maintains_array_length() {
        let data = solid_rgba(100, 150, 200, 255, 10);
        let dark_data = convert_rgba_to_dark_mode(&data);

        assert_eq!(
            data.len(),
            dark_data.len(),
            "Array length should be preserved"
        );
        assert_eq!(data.len() % 4, 0, "Array should be divisible by 4");
    }
}
