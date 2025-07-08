mod utils;
use wasm_bindgen::prelude::*;
use web_sys::console;

mod constants;
use constants::{
    oetf as fwd, oetf_inv as inv, ALPHA_TRANSPARENT_THRESHOLD, BT_709 as W, DOWNSCALE_SIZE,
    EFFICACY_LCD_LM_PER_W, EFFICACY_OLED_LM_PER_W, LUMA_BLACK_THRESHOLD, L_MAX,
};

mod pixel;
use pixel::Rgba;

use data_url::DataUrl;
use image::{imageops::FilterType, DynamicImage};

use std::f32::consts::PI;

use crate::{pixel::DisplayTech, utils::inch_to_meter, utils::set_panic_hook};

#[wasm_bindgen]
pub fn hello_wasm() {
    set_panic_hook();
    log("[WASM] LOADING COMPLETE");
}

pub fn average_luma_relative(pixels: &[u8]) -> f32 {
    debug_assert!(pixels.len() % constants::PIXEL_COMPONENTS == 0);

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
            log(&format!("[WASM] failed to process data URI: {}", err));
            0.0
        }
    }
}

fn process_data_uri(uri: &str) -> Result<f32, String> {
    let pixels = pixels_from_data_uri(uri)?;
    Ok(average_luma_in_nits(&pixels))
}

fn pixels_from_data_uri(uri: &str) -> Result<Vec<u8>, String> {
    let bytes = decode_data_uri(uri)?;
    let img = image::load_from_memory(&bytes)
        .map_err(|e| format!("image decode error: {}", e))?;
    Ok(downscale_to_size(&img, DOWNSCALE_SIZE))
}

fn decode_data_uri(uri: &str) -> Result<Vec<u8>, String> {
    let data_url = DataUrl::process(uri).map_err(|e| format!("invalid data URI: {}", e))?;

    let (bytes, _fragment) = data_url
        .decode_to_vec()
        .map_err(|e| format!("base64 decode error: {}", e))?;
    Ok(bytes)
}

fn downscale_to_size(img: &DynamicImage, size: u32) -> Vec<u8> {
    let resized: DynamicImage = img.resize_exact(size, size, FilterType::Triangle);
    resized.to_rgba8().into_raw()
}

#[wasm_bindgen]
pub fn estimate_saved_energy_mwh_from_data_uri(
    display_width: u32,  // inch
    display_height: u32, // inch
    hours: f32,
    tech: DisplayTech,
    uri: &str,
) -> u32 {
    // 1. Calculate display area
    let (display_width_meter, display_height_meter) = (
        inch_to_meter(display_width as f32),
        inch_to_meter(display_height as f32),
    );
    let display_area_m2 = display_width_meter * display_height_meter;

    // 2. Calculate electrical power saved (W)
    let delta_nits = estimate_saved_nits_from_data_uri(uri);
    let delta_lumen = PI * delta_nits * display_area_m2;
    let efficacy_lm_w = match tech {
        DisplayTech::LCD => EFFICACY_LCD_LM_PER_W,
        DisplayTech::OLED => EFFICACY_OLED_LM_PER_W,
    };
    let power_saved_w = delta_lumen / efficacy_lm_w;

    // 3. Calculate energy saved (MWh)
    let energy_saved_mwh = power_saved_w * hours * 1000.0;

    energy_saved_mwh.round() as u32
}

fn estimate_saved_nits_from_data_uri(uri: &str) -> f32 {
    match pixels_from_data_uri(uri).map(|small| {
        let nits = average_luma_in_nits(&small);
        let dark_pixels = convert_rgba_to_dark_mode(&small);
        let dark_nits = average_luma_in_nits(&dark_pixels);
        (nits - dark_nits).max(0.0)
    }) {
        Ok(v) => v,
        Err(err) => {
            log(&format!("[WASM] failed to estimate saved nits: {}", err));
            0.0
        }
    }
}

#[wasm_bindgen]
pub fn convert_rgba_to_dark_mode(pixels: &[u8]) -> Vec<u8> {
    debug_assert!(pixels.len() % constants::PIXEL_COMPONENTS == 0);

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
    if af < ALPHA_TRANSPARENT_THRESHOLD {
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
    if luma < LUMA_BLACK_THRESHOLD {
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

    #[test]
    fn inch_meter_roundtrip() {
        use crate::utils::{inch_to_meter, meter_to_inch};

        let inch_val = 13.37_f32;
        let meter_val = inch_to_meter(inch_val);
        let inch_back = meter_to_inch(meter_val);

        assert!(
            (inch_back - inch_val).abs() < 1e-4,
            "Inch->Meter->Inch round-trip failed"
        );
    }

    #[test]
    fn efficacy_constants_are_positive() {
        use crate::constants::{EFFICACY_LCD_LM_PER_W, EFFICACY_OLED_LM_PER_W};

        assert!(EFFICACY_LCD_LM_PER_W > 0.0);
        assert!(EFFICACY_OLED_LM_PER_W > 0.0);
    }

    #[test]
    fn decode_data_uri_handles_errors() {
        let bad_uri = "invalid_uri";
        let res = super::decode_data_uri(bad_uri);
        assert!(res.is_err(), "Expected error for invalid data URI");
    }

    #[test]
    fn decode_data_uri_success() {
        // 1×1 black PNG
        let data_uri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
        let res = super::decode_data_uri(data_uri);
        assert!(res.is_ok(), "Expected successful decode of valid data URI");
    }

    #[test]
    fn downscale_size_matches_expected() {
        use crate::constants::DOWNSCALE_SIZE;
        let data_uri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
        let img_bytes = super::decode_data_uri(data_uri).unwrap();
        let img = image::load_from_memory(&img_bytes).unwrap();
        let scaled = super::downscale_to_size(&img, DOWNSCALE_SIZE);
        assert_eq!(scaled.len(), (DOWNSCALE_SIZE * DOWNSCALE_SIZE * 4) as usize);
    }

    #[test]
    fn estimate_saved_energy_safe_on_invalid_uri() {
        let energy =
            estimate_saved_energy_mwh_from_data_uri(10, 10, 1.0, DisplayTech::LCD, "invalid_uri");
        assert_eq!(energy, 0);
    }

    #[test]
    fn convert_rgba_empty_slice() {
        let data: Vec<u8> = Vec::new();
        let out = convert_rgba_to_dark_mode(&data);
        assert!(
            out.is_empty(),
            "Empty input slice should yield empty output"
        );
    }
}

#[inline]
fn log(message: &str) {
    #[cfg(target_arch = "wasm32")]
    {
        console::log_1(&message.into());
    }

    #[cfg(not(target_arch = "wasm32"))]
    {
        println!("{}", message);
    }
}
