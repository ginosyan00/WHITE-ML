<?php
if ( ! defined( 'ABSPATH' ) ) exit;

// Idram for woocommerce
 class wc_apg_gatewey_idram extends WC_Payment_Gateway {

   public function __construct() {
      $this->id = 'wc_apg_gatewey_idram';
      $this->has_fields = true;
      $this->method_title = 'Idram Payment Gateway by Planet Studio';
      $this->method_description = 'Payment gateway for Idram';
      $this->enabled = $this->get_option('enabled');
      $this->title = $this->get_option('title');
      $this->description = $this->get_option('description');
      $this->init_form_fields();
      $this->init_settings();         
      add_action( 'woocommerce_update_options_payment_gateways_' . $this->id, array( $this, 'process_admin_options' ) );
   }

   public function init_form_fields() {
       $this->form_fields = apply_filters( 'wc_apg_form_fields', array(
           'enabled' => array(
               'title'   => 'Enable / Disable',
               'type'    => 'checkbox',
               'label'   => 'Idram Payment Gateway',
               'default' => 'yes'
           ),
           'title' => array(
               'title'       => 'Title',
               'type'        => 'text',
               'description' => '',
               'default'     => __( "Վճարել Իդրամով", 'arca-payment-gateway' ),
               'desc_tip'    => true,
           ),
           'description' => array(
               'title'       => 'Description',
               'type'        => 'text',
               'description' => '',
               'default'     => __( "Վճարումն իրականացվելու է հայկական դրամով:", 'arca-payment-gateway' ),
               'desc_tip'    => true,
           ),
       ) );
   }

   public function process_payment($wc_orderId) {
      return array(
         "result"    => "success",
         "redirect"  => get_site_url() . "?arca_process=idram&wc_orderId=$wc_orderId"
      );
   }

}

// Register the payment method in WooCommerce Blocks
add_action('woocommerce_blocks_payment_method_type_registration', function ($payment_method_registry) {

    $logo_url = ARCAPG_URL . '/images/idram.png';
    $gatewey_name = 'wc_apg_gatewey_idram';
    $gatewey_title = 'Idram Payment Gateway by Planet Studio';
    $gatewey_description = 'Payment gateway for Idram';

    $payment_method_registry->register(new wc_apg_gatewey_Blocks_Support( $gatewey_name, $gatewey_title, $gatewey_description, $logo_url ));

});