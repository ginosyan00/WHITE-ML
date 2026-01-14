<?php
if ( ! defined( 'ABSPATH' ) ) exit;

if( $_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST["apgDeactivate"]) && $_POST["apgDeactivate"] == "deactivate" ){

	// get plugin deactivate url
	$apgDeactivateUrl = ( isset($_POST["apgDeactivateUrl"]) ) ? sanitize_url($_POST["apgDeactivateUrl"]) : "?";

    // get deactivate reason
	$reason = ( isset($_POST["reason"]) ) ? intval($_POST["reason"]) : 0;
	
    // get deactivate user reason
	$userReason = ( isset($_POST["user-reason"]) ) ? sanitize_text_field($_POST["user-reason"]) : null;

	$requestUrl = "https://store.planetstudio.am/test.php";
	$args = array(
		'headers'	=> array('Content-Type: text/html; charset=UTF-8'),
		'body'		=> array(
			'domain'		=> get_site_url(),
			'reason'		=> $reason,
			'userReason'	=> $userReason,
			'plugin'		=> 'ArCa Payment Gateway PRO ' . ARCAPG_VERSION,
		),
		'method'		=> 'POST',
		'data_format'	=> 'body',
	);
	wp_remote_post( $requestUrl, $args );

	// redirect to bank page
	wp_redirect($apgDeactivateUrl);
	exit;

}
?>
<div id="apg-deactivate-popup" class="apg-popup">
	<div id="apg-deactivate-form-container">
		
		<form method="post">

			<div class="apg-deactivate-form-header">
				<?php esc_html_e("ArCa Payment Gateway Deactivation", 'arca-payment-gateway' ) ?>
			</div>

			<div class="apg-deactivate-form-body">

				<p><?php esc_html_e("If you have a moment, please let us know why you are deactivating this plugin. All submissions are anonymous and we only use this feedback to improve this plugin.", 'arca-payment-gateway' ) ?></p>

				<label>
					<input type="radio" name="reason" value="1">
					<?php esc_html_e("I'm only deactivating temporarily", 'arca-payment-gateway' ) ?>
				</label>
				<label>
					<input type="radio" name="reason" value="2">
					<?php esc_html_e("I no longer need the plugin", 'arca-payment-gateway' ) ?>
				</label>
				<label>
					<input type="radio" name="reason" value="3">
					<?php esc_html_e("I only needed the plugin for a short period", 'arca-payment-gateway' ) ?>
				</label>
				<label>
					<input type="radio" name="reason" value="4">
					<?php esc_html_e("The plugin broke my site", 'arca-payment-gateway' ) ?>
				</label>
				<div id="apg-reason-other-field-4" class="apg-reason-other-field">
					<p><?php esc_html_e("We're sorry to hear that, check our support. Can you describe the issue?", 'arca-payment-gateway' ) ?></p>
					<textarea name="user-reason" rows="6"></textarea>
				</div>			
				<label>
					<input type="radio" name="reason" value="5">
					<?php esc_html_e("The plugin suddenly stopped working", 'arca-payment-gateway' ) ?>
				</label>
				<div id="apg-reason-other-field-5" class="apg-reason-other-field">
					<p><?php esc_html_e("We're sorry to hear that, check our support. Can you describe the issue?", 'arca-payment-gateway' ) ?></p>
					<textarea name="user-reason" rows="6"></textarea>
				</div>
				<label>
					<input type="radio" name="reason" value="6">
					<?php esc_html_e("Other", 'arca-payment-gateway' ) ?>
				</label>
				<div id="apg-reason-other-field-6" class="apg-reason-other-field">
					<p><?php esc_html_e("Please describe why you're deactivating", 'arca-payment-gateway' ) ?></p>
					<textarea name="user-reason" rows="6"></textarea>
				</div>

				<div id="apg-deactivation-error-msg">
					<?php esc_html_e("Please select at least one option.", 'arca-payment-gateway' ) ?>
				</div>

			</div>
				
			<div class="apg-deactivate-form-footer">
				<a href="#" id="skip-and-deactivate"><?php esc_html_e("Skip and Deactivate", 'arca-payment-gateway' ) ?></a>
				<input type="hidden" name="apgDeactivate" value="deactivate">
				<input type="hidden" id="apg-deactivate-url" name="apgDeactivateUrl" value="">
				<input type="button" class="button popupCloseButton" value="<?php esc_html_e("Cancel", 'arca-payment-gateway' ) ?>">
				<input type="submit" class="button button-primary" value="<?php esc_html_e("Submit and Deactivate", 'arca-payment-gateway' ) ?>">
			</div>

		</form>

	</div>
</div>