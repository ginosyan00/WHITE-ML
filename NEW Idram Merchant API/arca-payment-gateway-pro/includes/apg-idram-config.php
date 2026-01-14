<?php
if ( ! defined( 'ABSPATH' ) ) exit;

// wp verify nonce
require_once ('apg-wp-verify-nonce.php');

global $wpdb, $arca_idram_config;

$strMgs = $errMgs = "";

if ( $_SERVER["REQUEST_METHOD"] == "POST" ) {

    $act = ( !empty($_POST["act"]) ) ? sanitize_text_field( $_POST["act"] ) : "";

    if( $act == "save" ) {

        // validate rocketLine
        if ( !empty($_POST["idramEnabled"]) ) {
            $idramEnabled = arca_pg_sanitize_input($_POST["idramEnabled"]);
        } else{
            $idramEnabled = 0;
        }

        // validate idramID
        if ( !empty($_POST["idramID"]) ) {
            $idramID = arca_pg_sanitize_input($_POST["idramID"]);
        } else{
            $idramID = "";
        }

        // validate idramKey
        if ( !empty($_POST["idramKey"]) ) {
            $idramKey = arca_pg_sanitize_input($_POST["idramKey"]);
        } else{
            $idramKey = "";
        }

        // validate idramTestID
        if ( !empty($_POST["idramTestID"]) ) {
            $idramTestID = arca_pg_sanitize_input($_POST["idramTestID"]);
        } else{
            $idramTestID = "";
        }

        // validate idramTestKey
        if ( !empty($_POST["idramTestKey"]) ) {
            $idramTestKey = arca_pg_sanitize_input($_POST["idramTestKey"]);
        } else{
            $idramTestKey = "";
        }

        // validate rocketLine
        if ( !empty($_POST["rocketLine"]) ) {
            $rocketLine = arca_pg_sanitize_input($_POST["rocketLine"]);
        } else{
            $rocketLine = 0;
        }

        // validate testMode
        if ( !empty($_POST["testMode"]) ) {
            $testMode = arca_pg_sanitize_input($_POST["testMode"]);
        } else{
            $testMode = 0;
        }

        // validate wc order status
        if ( !empty($_REQUEST["wc_order_status"]) ) {
            $wc_order_status = esc_attr($_REQUEST["wc_order_status"]);
        } else {
            $wc_order_status = "Processing";
        }

        // validate default_language
        if ( !empty($_POST["default_language"]) ) {
            $default_language = arca_pg_sanitize_input($_POST["default_language"]);
        } else {
            $errMgs .= __( "incorrect default_language", 'arca-payment-gateway' ) . "<br>";
        }

        if( $errMgs == "" ) {

            // update configs
            $table = $wpdb->prefix.'arca_pg_idram_config';
            $data = array(
                'idramID'			=> $idramID,
                'idramKey'			=> $idramKey,
                'idramTestID'		=> $idramTestID,
                'idramTestKey'		=> $idramTestKey,
                'rocketLine'		=> $rocketLine,
                'testMode'			=> $testMode,
                'idramEnabled'		=> $idramEnabled,
                'wc_order_status'	=> $wc_order_status,
                'default_language'	=> $default_language,
            );

            $data_format = array('%s', '%s', '%s', '%s', '%d', '%d', '%d', '%s', '%s');
            $where = array('id' => 1);
            $where_format = array('%d');
            $wpdb->update( $table, $data, $where, $data_format, $where_format );

            $strMgs = __( "Done!", 'arca-payment-gateway' );
        }


    }

}

// sanitize form data
function arca_pg_sanitize_input($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data);
    return $data;
}

?>

<div class="wrap apg" id="apg-config">

    <h1>
        <?php esc_html_e("Idram Settings", 'arca-payment-gateway' ) ?>
        <span class="apg-test-mode">
            <?php if ( $arca_idram_config->testMode ) { esc_html_e("TEST MODE", 'arca-payment-gateway' ); } ?>
        </span>
    </h1>

    <p>
        <?php
        if($errMgs != "" || $strMgs != "" ){
            echo wp_kses_post($errMgs), wp_kses_post($strMgs);
        }
        ?>
    </p>

    <div class="apg-main-container">

        <br>

        <img class='bank-logo' src='<?php echo esc_url(ARCAPG_URL . "/images/idram.png"); ?>'>

        <?php
        $row = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM {$wpdb->prefix}arca_pg_idram_config WHERE id = %d",
                1
            ),
            ARRAY_A
        );
        ?>

        <form action="" method="post">

            <h3 class="apg-vpos-login-pass-caption"><?php esc_html_e("Idram Account", 'arca-payment-gateway' ) ?></h3>

            <table class="apg-table-noborder">
                <tr>
                    <td><input type="checkbox" name="idramEnabled" id="idramEnabled" value="1" <?php echo ($row["idramEnabled"] == 1) ? 'checked' : '' ?>></td>
                    <td><label for="idramEnabled"><?php esc_html_e("Enable Idram", 'arca-payment-gateway' ) ?></label></td>
                </tr>
            </table>
            <br>

            <legend><?php esc_html_e("Idram ID:", 'arca-payment-gateway' ) ?></legend>
            <input type="text" name="idramID" value="<?php echo esc_attr($row["idramID"]); ?>" placeholder="<?php esc_html_e("Idram Payment System provide it", 'arca-payment-gateway' ) ?>">

            <legend><?php esc_html_e("Idram Key:", 'arca-payment-gateway' ) ?></legend>
            <div class="api-password-container">
                <input type="password" name="idramKey" value="<?php echo esc_attr($row["idramKey"]); ?>" placeholder="<?php esc_html_e("Idram Payment System provide it", 'arca-payment-gateway' ) ?>"  class="api-password" autocomplete="new-password">
                <span class="show-hide"></span>
            </div>

            <br>
            <h3 class="apg-vpos-login-pass-caption"><?php esc_html_e("Idram Test Account", 'arca-payment-gateway' ) ?></h3>

            <table class="apg-table-noborder">
                <tr>
                    <td><input type="checkbox" name="testMode" id="testMode" value="1" <?php echo ($row["testMode"] == 1) ? 'checked' : '' ?>></td>
                    <td><label for="testMode"><?php esc_html_e("Enable test mode", 'arca-payment-gateway' ) ?></label></td>
                </tr>
            </table>
            <br>

            <legend><?php esc_html_e("Idram Test ID:", 'arca-payment-gateway' ) ?></legend>
            <input type="text" name="idramTestID" value="<?php echo esc_attr($row["idramTestID"]); ?>" placeholder="<?php esc_html_e("Idram Payment System provide it", 'arca-payment-gateway' ) ?>">

            <legend><?php esc_html_e("Idram Test Key:", 'arca-payment-gateway' ) ?></legend>
            <div class="api-password-container">
                <input type="password" name="idramTestKey" value="<?php echo esc_attr($row["idramTestKey"]); ?>" placeholder="<?php esc_html_e("Idram Payment System provide it", 'arca-payment-gateway' ) ?>"  class="api-password" autocomplete="new-password">
                <span class="show-hide"></span>
            </div>

            <br>

            <table class="apg-table-noborder">
                <tr>
                    <td><input type="checkbox" name="rocketLine" id="rocketLine" value="1" <?php echo ($row["rocketLine"] == 1) ? 'checked' : '' ?>></td>
                    <td><label for="rocketLine"><?php esc_html_e("Enable Roket Line", 'arca-payment-gateway' ) ?></label></td>
                </tr>
            </table>

            <br>

            <legend><?php esc_html_e("Default language:", 'arca-payment-gateway' ) ?></legend>
            <select name="default_language">
                <?php
                $arca_idram_languages = $wpdb->get_results(
                    "SELECT * FROM {$wpdb->prefix}arca_pg_idram_language ORDER BY language"
                );
                if( $arca_idram_languages ) {
                    foreach ( $arca_idram_languages as $language ) {
                        echo "<option " . (($row["default_language"] == $language->code) ? 'selected' : '') ." value='". esc_attr($language->code) ."'>". esc_html($language->code ." - ". $language->language) ."</option>";
                    }
                }
                ?>
            </select>

            <br>

            <?php if ( class_exists('woocommerce') ) { ?>
                <legend><?php esc_html_e("WooCommerce order status:", 'arca-payment-gateway' ) ?></legend>
                <select name="wc_order_status">
                    <option value="processing" <?php echo ($row["wc_order_status"] == "processing") ? 'selected' : ''; ?>>Processing</option>
                    <option value="completed" <?php echo ($row["wc_order_status"] == "completed") ? 'selected' : ''; ?>>Completed</option>
                </select>
            <?php } ?>

            <?php apg_wp_nonce_field(); ?>
            <input type="hidden" name="act" value="save">
            <input class="submitLink button-primary" type="submit" value="<?php esc_html_e("Save", 'arca-payment-gateway' )?>">

        </form>

        <br>
        <div class="apg-saperator"></div>

        <?php $apg_site_url = get_site_url(); ?>
        <h2><?php esc_html_e("Idram Callback URLs", 'arca-payment-gateway' )?> <span class="dashicons dashicons-admin-page copyToClipboard" onclick="CopyToClipboard('callback-urls')" title="<?php esc_html_e("Copy", 'arca-payment-gateway' ) ?>"></span></h2>
        <p id="callback-urls">
            <b>Result:</b> <?php echo wp_kses_post($apg_site_url); ?>/wc-api/idram_result<br>
            <b>Success:</b> <?php echo wp_kses_post($apg_site_url); ?>/wc-api/idram_complete<br>
            <b>Fail:</b> <?php echo wp_kses_post($apg_site_url); ?>/wc-api/idram_fail
        </p>
    </div>
</div>
