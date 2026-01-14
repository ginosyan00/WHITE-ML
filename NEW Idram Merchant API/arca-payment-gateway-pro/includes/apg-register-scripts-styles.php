<?php
if ( ! defined( 'ABSPATH' ) ) exit;

add_action('admin_enqueue_scripts', 'arca_pg_register_admin_scripts_style');
function arca_pg_register_admin_scripts_style() {
    wp_enqueue_style('dashicons');
    wp_register_style('arca-payments-gateway-admin', ARCAPG_URL . '/css/admin.css', FALSE, ARCAPG_VERSION);
    wp_enqueue_style('arca-payments-gateway-admin');
    wp_register_script('arca-payments-gateway', ARCAPG_URL . '/script/admin.js', array( 'jquery' ), ARCAPG_VERSION);
    wp_print_styles('wp-admin');
    wp_localize_script("arca-payments-gateway", 'arcapg_admin', array(
      'copied_to_clipboard' => __("Copied to clipboard!", 'arca-payment-gateway' ),
      'confirm_delete' => __("Are you sure you want to delete this item?", 'arca-payment-gateway' ),
      'activation_key_is_required' => __("Activation Key is required", "arca-payment-gateway" ),
      'something_went_wrong_please_try_again' => __("Something went wrong, please try again.", "arca-payment-gateway" ),
    ));
    wp_enqueue_script('arca-payments-gateway');
}

add_action('wp_enqueue_scripts', 'arca_pg_register_front_scripts_style');
function arca_pg_register_front_scripts_style() {
    wp_register_style('arca-payments-gateway', ARCAPG_URL . '/css/style.css', FALSE, ARCAPG_VERSION);
    wp_enqueue_style('arca-payments-gateway');
}
