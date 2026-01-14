<?php
if ( ! defined( 'ABSPATH' ) ) exit;

// vPOS for woocommerce
class wc_apg_gatewey extends WC_Payment_Gateway {

    public function __construct() {

        global $arca_config;

        $this->id = 'wc_apg_gatewey';
        $this->has_fields = true;
        $this->method_title = 'ArCa Payment Gateway by Planet Studio';
        $this->method_description = 'Payment gateway for Armenian banks';
        $this->enabled = $this->get_option('enabled');
        $this->title = $this->get_option('title');
        $this->description = $this->get_option('description');

        // subscription supports
        // if ArCa system bank
//        if( $arca_config->bankId != 4 && $arca_config->bankId != 10 ) {
//            $this->supports = array(
//                'products',
//                'subscriptions', // Поддержка подписок
//                'subscription_cancellation', // Отмена подписки
//                'subscription_suspension',   // Приостановка подписки
//                'subscription_reactivation', // Возобновление подписки
//                'subscription_amount_changes', // Изменение суммы подписки
//                'subscription_date_changes',   // Изменение даты подписки
//                'multiple_subscriptions',      // Несколько подписок в одном заказе
//                //'tokenization', // Обязательно для сохранения и отвязки карт
//            );
//        }

        $this->init_form_fields();
        $this->init_settings();
        add_action('woocommerce_update_options_payment_gateways_' . $this->id, array($this, 'process_admin_options'));

        // subscription supports
        // if ArCa system bank
//        if( $arca_config->bankId != 4 && $arca_config->bankId != 10 ) {
//            add_action('woocommerce_scheduled_subscription_payment_' . $this->id, array($this, 'process_subscription_payment'), 10, 2);
//        }
    }

    public function init_form_fields() {
        $this->form_fields = apply_filters( 'wc_apg_form_fields', array (
            'enabled' => array(
                'title'   => 'Enable / Disable',
                'type'    => 'checkbox',
                'label'   => 'ArCa / InecoBank / Ameria Bank Payment Gateway',
                'default' => 'yes'
            ),
            'title' => array(
                'title'       => 'Title',
                'type'        => 'text',
                'description' => '',
                'default'     => 'Credit Card',
                'desc_tip'    => true,
            ),
            'description' => array(
                'title'       => 'Description',
                'type'        => 'text',
                'description' => '',
                'default'     => 'ArCa, MasterCard, Visa, Maestro',
                'desc_tip'    => true,
            ),
        ) );
    }

    public function process_payment($wc_orderId) {

        return array(
            "result"    => "success",
            "redirect"  => get_site_url() . "?arca_process=register&wc_orderId=$wc_orderId"
        );

    }

    // subscription payment
    public function process_subscription_payment($amount_to_charge, $order) {

        include_once ("apg_BINDING.php");
        $binding = new apg_BINDING();
        $result = $binding->MakeBindingPayment($amount_to_charge, $order);

        if ($result) {
            return ["result" => "success"];
        } else {
            return ["result" => "failed"];
        }

    }

}

// Register the payment method in WooCommerce Blocks
add_action('woocommerce_blocks_payment_method_type_registration', function ($payment_method_registry) {

    $logo_url = ARCAPG_URL . '/images/payment-icon.png';
    $gatewey_name = 'wc_apg_gatewey';
    $gatewey_title = 'ArCa Payment Gateway by Planet Studio';
    $gatewey_description = 'Payment gateway for Armenian banks';

    $payment_method_registry->register(new wc_apg_gatewey_Blocks_Support( $gatewey_name, $gatewey_title, $gatewey_description, $logo_url ));

});


// Add "vPOS Transaction" custom column to the WooCommerce orders table
add_filter( 'manage_edit-shop_order_columns', 'arca_pg_add_order_column_wc_orders' );
function arca_pg_add_order_column_wc_orders( $columns ) {
    $columns['arca_pg_orderid'] = '<span class="apg-wc-column" title="' . esc_attr__( 'vPOS transaction number', 'arca-payment-gateway' ) . '">' . esc_html__( 'vPOS Transaction', 'arca-payment-gateway' ) . '</span>';
    return $columns;
}

// Render value for the custom "vPOS Transaction" column
add_action( 'manage_shop_order_posts_custom_column', 'arca_pg_render_order_column_wc_orders', 10, 2 );
function arca_pg_render_order_column_wc_orders( $column, $post_id ) {
    if ( $column === 'arca_pg_orderid' ) {
        global $wpdb;

        $orders_table = $wpdb->prefix . 'arca_pg_orders';
        $banks_table  = $wpdb->prefix . 'arca_pg_banks';

        $order_id = intval( $post_id );

        $query = $wpdb->prepare(
            "
            SELECT o.orderid, b.bankName
            FROM $orders_table o
            LEFT JOIN $banks_table b ON o.bankId = b.bankId
            WHERE o.wc_orderId = %d
            LIMIT 1
            ",
            $order_id
        );

        $result = $wpdb->get_row( $query );

        $orderid  = $result ? $result->orderid : null;
        $bankname = $result ? $result->bankName : null;

        echo "<span title='" . esc_attr( $bankname ) . "'>" . esc_html( $orderid ?: '—' ) . "</span>";
    }
}

// Add filter dropdown to filter orders by payment method (classic orders screen)
add_action( 'restrict_manage_posts', 'apg_filter_orders_by_payment_method' );
function apg_filter_orders_by_payment_method() {
    global $typenow;

    if ( $typenow !== 'shop_order' || ! function_exists( 'WC' ) ) {
        return;
    }

    $selected = isset($_GET['_payment_method']) ? sanitize_text_field($_GET['_payment_method']) : '';
    $gateways = WC()->payment_gateways->get_available_payment_gateways();

    echo '<select name="_payment_method" style="margin-left: 5px;">';
    echo '<option value="">' . esc_html__( 'All payment methods', 'woocommerce' ) . '</option>';

    foreach ( $gateways as $gateway_id => $gateway ) {
        printf(
            '<option value="%s"%s>%s</option>',
            esc_attr( $gateway_id ),
            selected( $selected, $gateway_id, false ),
            esc_html( $gateway->get_title() )
        );
    }

    echo '</select>';
}

// Apply payment method filter to the WooCommerce order query
add_filter( 'woocommerce_order_query_args', 'apg_filter_orders_query_by_payment_method' );
function apg_filter_orders_query_by_payment_method( $args ) {
    if ( isset($_GET['_payment_method']) && $_GET['_payment_method'] !== '' ) {
        $args['payment_method'] = sanitize_text_field($_GET['_payment_method']);
    }
    return $args;
}