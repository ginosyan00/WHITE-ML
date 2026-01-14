<?php
if ( ! defined( 'ABSPATH' ) ) exit;

add_action( 'wp_dashboard_setup', 'add_apg_dashboard_widgets' );

function add_apg_dashboard_widgets() {
   wp_add_dashboard_widget( 'apg_dashboard_widget', 'ArCa Payment Gateway: ' . __( "Finance report", 'arca-payment-gateway' ), 'apg_dashboard_widget_function' );
}

function apg_dashboard_widget_function( $post, $callback_args ) {
   require_once("apg-widget.php");
}
