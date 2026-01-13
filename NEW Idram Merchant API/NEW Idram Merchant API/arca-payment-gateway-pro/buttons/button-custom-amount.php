<?php
if ( ! defined( 'ABSPATH' ) ) exit;
?>

<div class="arca-pg arca-pg-custom-amount-pay-button">
    <p class=""><?php echo esc_html($description); ?></p>
    <form action="?arca_process=<?php echo esc_attr($arca_process); ?>" method="post">
        <input type="hidden" name="custom_amount" value="1">
        <input type="hidden" name="language" value="<?php echo esc_attr($language); ?>">
        <input type="hidden" name="description" value="<?php echo esc_attr($description); ?>">

        <?php if( $arca_process == "register" ){ ?>
            <select name="currency" >
                <?php
                $arca_currencies = $wpdb->get_results(
                    $wpdb->prepare(
                        "SELECT * FROM {$wpdb->prefix}arca_pg_currency WHERE active = %d ORDER BY code",
                        1
                    )
                );

                if( $arca_currencies ) {
                    foreach ( $arca_currencies as $currency ) {
                        echo "<option value='".esc_attr($currency->code)."'>".esc_html($currency->abbr)."</option>";
                    }
                }
                ?>
            </select>
        <?php } else { ?>
            <span>AMD</span>
        <?php } ?>

        <input type="text" pattern="[0-9]+([\.][0-9]+)?" name="amount" value="<?php echo esc_attr($amount); ?>">
        <input type="submit" value="<?php esc_html_e( "Pay","arca-payment-gateway" ) ?>">
    </form>
</div>