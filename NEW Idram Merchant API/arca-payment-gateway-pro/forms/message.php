<?php
if ( ! defined( 'ABSPATH' ) ) exit;

$strMgs = "";

switch ($state) {
	case "error":
		$strMgs = __( "An error has occurred", 'arca-payment-gateway' );
	break;
	default:
		$strMgs = __( "Unfortunately your payment has failed", 'arca-payment-gateway' );
}
?>

<div id="arca-pg-message" class="arca-pg">

	<h1><?php esc_html_e("Payment has failed", 'arca-payment-gateway' ) ?></h1>

	<p><?php echo wp_kses_post($strMgs); ?></p>

</div>