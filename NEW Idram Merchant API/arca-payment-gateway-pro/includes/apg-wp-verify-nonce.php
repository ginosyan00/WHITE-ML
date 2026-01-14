<?php
if ( ! defined( 'ABSPATH' ) ) exit;

if ( isset($_REQUEST['act']) && (!isset($_REQUEST['apg_request_nonce']) || !wp_verify_nonce($_REQUEST['apg_request_nonce'], 'apg_request_nonce')) ) {
    wp_die('Access denied.');
}

function apg_wp_nonce_field(){
    $apg_request_nonce = sanitize_text_field(wp_create_nonce('apg_request_nonce'));
    echo "<input type='hidden' name='apg_request_nonce' value='".esc_attr($apg_request_nonce)."'>";
}

function apg_wp_nonce_arg(){
    $apg_request_nonce = sanitize_text_field(wp_create_nonce('apg_request_nonce'));
    echo "&apg_request_nonce=".esc_attr($apg_request_nonce);
}