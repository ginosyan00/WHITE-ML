<?php
if ( ! defined( 'ABSPATH' ) ) exit;

global $wpdb, $arca_config;

// get orderId
$orderId = (isset($_REQUEST['orderId'])) ? sanitize_text_field($_REQUEST['orderId']) : null;

if(!isset($orderId)) return false;

// get QR code
if( has_filter('eHDM-getReceiptQR') ){

    $table_name = $wpdb->prefix . 'ehdm_receipts';
    $receiptId = $wpdb->get_var("SELECT receiptId FROM $table_name WHERE orderId = '$orderId'" );

    if( $receiptId ) {
        $ehdm_qr_image = apply_filters('eHDM-getReceiptQR', $receiptId);
    } else {
        $ehdm_qr_image = false;
    }

} else {
    $ehdm_qr_image = false;
}

// get order
$order = $wpdb->get_row(
    $wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}arca_pg_orders WHERE orderId = %s",
        $orderId
    )
);

// get order details from json
$orderDetails = json_decode($order->orderDetails);
$currency = $wpdb->get_row(
    $wpdb->prepare(
        "SELECT abbr FROM {$wpdb->prefix}arca_pg_currency WHERE code = %s",
        $order->currency
    )
);


// get product details
$productDetails = $wpdb->get_row( $wpdb->prepare(
    "SELECT * FROM {$wpdb->prefix}arca_pg_pricelist WHERE productId = %d",
    $order->productId
) );
?>

<div id="arca-pg-order-invoice" class="arca-pg">
	<h1><?php esc_html_e("Your invoice", 'arca-payment-gateway' ) ?></h1>
	<p>
		<?php esc_html_e("Invoice number:", 'arca-payment-gateway' ) ?> <?php echo esc_html($order->orderNumber); ?><br>
		<?php esc_html_e("Date of payment:", 'arca-payment-gateway' ) ?> <?php echo esc_html($order->orderDate); ?><br>
		<?php esc_html_e("Sum", 'arca-payment-gateway' ) ?> <?php echo esc_html($order->amount); ?> <?php echo esc_html($currency->abbr); ?><br>
	</p>

    <?php

    // eHDM get QR
    if( $ehdm_qr_image ){
        echo '<p>' . __( "Your Receipt QR Code", 'arca-payment-gateway' ) . '</p>';
        echo '<p>' . $ehdm_qr_image . '</p>';
    }
    ?>

    <p>
        <?php esc_html_e("Thanks for your payment, our specialist will contact you.", 'arca-payment-gateway' ) ?>
    </p>
</div>

<?php
if(isset($orderDetails->email) && !$order->mailSent){

	$from 		=	"From: ". get_bloginfo('name') ." <" . (($arca_config->mailFrom != "") ? $arca_config->mailFrom : get_bloginfo('admin_email')) . ">";
	$headers	=	array(
					$from,
					"content-type: text/html",
					);
	$to			=	$orderDetails->email;
	
	$subject	=	__( "Invoice", 'arca-payment-gateway' );

	$message	=	"";
	$message	.=	"<h1>" . __( "Your invoice", 'arca-payment-gateway' ) . "</h1>";
	$message	.=	__("Invoice number:", 'arca-payment-gateway' ) . " " . $order->orderNumber . "<br>";
	$message	.=	__("Date of payment:", 'arca-payment-gateway' ) . " " . $order->orderDate . "<br>";
	$message	.=	__("Sum", 'arca-payment-gateway' ) . " " . $order->amount . " " . $currency->abbr . "<br>";
	$message	.=	"<br>";

    if( $ehdm_qr_image ) {
        $message .= __("Your Receipt QR Code", 'arca-payment-gateway') . "<br><br>";
        $message .= $ehdm_qr_image . "<br>";
        $message .= "<br>";
    }
	$message	.=	__( "Thanks for your payment, our specialist will contact you.", 'arca-payment-gateway' ) . "<br>";
	$message	.=	"<br>";
	$message	.=	"<a href='". get_bloginfo('url') ."'>" . get_bloginfo('name') . "</a>";

	// send mail
	wp_mail( $to, $subject, $message, $headers );

	// set mailSent true
    $wpdb->query(
        $wpdb->prepare(
            "UPDATE {$wpdb->prefix}arca_pg_orders SET mailSent = %d WHERE orderId = %s",
            1,
            $orderId
        )
    );

}
