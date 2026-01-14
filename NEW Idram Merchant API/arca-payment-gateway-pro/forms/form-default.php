<?php
if ( ! defined( 'ABSPATH' ) ) exit;

global $wpdb, $arca_idram_config;

if( !empty($_REQUEST["state"]) ){

  // get order state
  $state = sanitize_text_field($_REQUEST["state"]);

  if( $state == "DEPOSITED" ){
    include("invoice.php");
  } else {
    include("message.php");   
  }

  return false;
}

// get payment form elements from $arca_confog
$formElements = json_decode($arca_config->checkoutFormElements);
?>

<div id="arca-pg-checkout-form" class="arca-pg">

  <h2><?php esc_html_e("Your order", 'arca-payment-gateway' ) ?></h2>

  <h3><?php echo esc_html($productName); ?></h3>

  <div id="arca-pg-order_review">
    <?php esc_html_e("Price:", 'arca-payment-gateway' ) ?> <?php echo esc_html($productPrice . " " . $currencyAbbr); ?><br>
    <?php echo esc_html($productDescription); ?>
  </div>
	
  <h2><?php esc_html_e("Billing details", 'arca-payment-gateway' ) ?></h2>

  <form method="post" action="">
    <?php foreach ($formElements as $elementName => $elementOptions) { ?>
      <?php if($elementOptions->enabled){ ?>
        <?php echo ($elementOptions->required) ? '* ' : '' ?> <?php echo esc_html($elementOptions->label); //_e( esc_html($elementOptions->label), 'arca-payment-gateway' )?>
        <?php if( $elementOptions->type == "text" || $elementOptions->type == "email" ){ ?>
          <input type="<?php echo esc_attr($elementOptions->type); ?>" name="<?php echo esc_attr($elementName); ?>"<?php echo ($elementOptions->required) ? ' required' : '' ?>>
        <?php } elseif ( $elementOptions->type == "textarea" ) { ?>
          <textarea name="<?php echo esc_attr($elementName); ?>"<?php echo ($elementOptions->required) ? ' required' : '' ?>></textarea>
        <?php } ?>
      <?php } ?>
    <?php } ?>
    <input type="hidden" name="language" value="<?php echo esc_attr($language); ?>">
    <input type="hidden" name="currency" value="<?php echo esc_attr($currencyCode); ?>">
    <input type="hidden" name="productId" value="<?php echo esc_attr($productId); ?>">
    <input type="hidden" name="description" value="<?php echo esc_attr($productDescription); ?>">

    <div id="apg-payment-system-switcher">
      <div>
        <input type="radio" name="arca_process" value="register" id="credit_card" checked>
        <label for="credit_card">
          <span><?php esc_html_e("Credit Card", 'arca-payment-gateway' ) ?></span>
          <img src="<?php echo esc_url(ARCAPG_URL); ?>/images/payment-icon.png?v=<?php echo esc_attr(ARCAPG_VERSION); ?>">
        </label>
      </div>
      
      <?php if($arca_idram_config->idramEnabled){ ?>
      <div>
        <input type="radio" name="arca_process" value="idram" id="idram">
        <label for="idram">
          <span><?php esc_html_e("Idram", 'arca-payment-gateway' ) ?></span>
          <img src="<?php echo esc_url(ARCAPG_URL); ?>/images/<?php echo ($arca_idram_config->rocketLine) ? "idram-rocket-2.png" : "idram.png" ;  ?>">
          <?php if($arca_idram_config->testMode){ ?>
            <span class="idram-test-mode-lable"><?php esc_html_e("Test Mode", 'arca-payment-gateway' ); ?></span>
          <?php } ?>
        </label>
      </div>
      <?php } ?>
      
    </div>

    <div id="apg-terms-container">
      <input type="checkbox" name="apg-terms" id="apg-terms-checkbox" required>
      <label for="apg-terms-checkbox">
        <?php if(!arca_pg_privacyPolicyPagePermalink()){ ?>
          <?php esc_html_e("* I have read and agree to the website terms and conditions", 'arca-payment-gateway' ) ?>
        <?php } else { ?>
          <a href="<?php echo esc_attr(arca_pg_privacyPolicyPagePermalink()); ?>" target="_blank"><?php esc_html_e("* I have read and agree to the website terms and conditions", 'arca-payment-gateway' ) ?></a>
        <?php } ?>
      </label>
    </div>

    <input type="submit" value="<?php esc_html_e("Pay", 'arca-payment-gateway' ) ?>">


  </form>
</div>


