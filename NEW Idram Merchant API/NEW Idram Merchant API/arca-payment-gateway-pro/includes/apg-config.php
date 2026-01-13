<?php
if ( ! defined( 'ABSPATH' ) ) exit;

// wp verify nonce
require_once ('apg-wp-verify-nonce.php');

global $wpdb, $arca_config;

$strMgs = $errMgs = "";

if ( $_SERVER["REQUEST_METHOD"] == "POST" ) {

    $act = ( !empty($_POST["act"]) ) ? sanitize_text_field( $_POST["act"] ) : "";
    $bankId = ( isset($_POST["bankId"]) ) ? intval($_POST["bankId"]) : $arca_config->bankId;

    if( $act == "save" ) {

        // get vPOS accounts
        $apg_vpos_accuonts = json_decode( $arca_config->vpos_accuonts, true );

        // validate AMD user, pass
        if(isset($_POST["amd_api_userName"]) || isset($_POST["amd_api_password"])){
            if ( !empty($_POST["amd_api_userName"]) ){
                $apg_vpos_accuonts["051"]["api_userName"] = sanitize_text_field($_POST["amd_api_userName"]);
            } else{
                $errMgs .= __( "Incorrect API username", 'arca-payment-gateway' ) . " - AMD<br>";
            }
            if ( !empty($_POST["amd_api_password"]) ) {
                $apg_vpos_accuonts["051"]["api_password"] = $_POST["amd_api_password"];
            } else {
                $errMgs .= __( "Incorrect API password", 'arca-payment-gateway' ) . " - AMD<br>";
            }
        }

        // validate RUB user, pass
        if(isset($_POST["rub_api_userName"]) || isset($_POST["rub_api_password"])){
            if ( !empty($_POST["rub_api_userName"]) ){
                $apg_vpos_accuonts["643"]["api_userName"] = sanitize_text_field($_POST["rub_api_userName"]);
            } else{
                $errMgs .= __( "Incorrect API username", 'arca-payment-gateway' ) . " - RUB<br>";
            }
            if ( !empty($_POST["rub_api_password"]) ) {
                $apg_vpos_accuonts["643"]["api_password"] = $_POST["rub_api_password"];
            } else {
                $errMgs .= __( "Incorrect API password", 'arca-payment-gateway' ) . " - RUB<br>";
            }
        }

        // validate USD user, pass
        if(isset($_POST["usd_api_userName"]) || isset($_POST["usd_api_password"])){
            if ( !empty($_POST["usd_api_userName"]) ){
                $apg_vpos_accuonts["840"]["api_userName"] = sanitize_text_field($_POST["usd_api_userName"]);
            } else{
                $errMgs .= __( "Incorrect API username", 'arca-payment-gateway' ) . " - USD<br>";
            }
            if ( !empty($_POST["usd_api_password"]) ) {
                $apg_vpos_accuonts["840"]["api_password"] = $_POST["usd_api_password"];
            } else {
                $errMgs .= __( "Incorrect API password", 'arca-payment-gateway' ) . " - USD<br>";
            }
        }

        // validate EUR user, pass
        if(isset($_POST["eur_api_userName"]) || isset($_POST["eur_api_password"])){
            if ( !empty($_POST["eur_api_userName"]) ){
                $apg_vpos_accuonts["978"]["api_userName"] = sanitize_text_field($_POST["eur_api_userName"]);
            } else{
                $errMgs .= __( "Incorrect API username", 'arca-payment-gateway' ) . " - EUR<br>";
            }
            if ( !empty($_POST["eur_api_password"]) ) {
                $apg_vpos_accuonts["978"]["api_password"] = $_POST["eur_api_password"];
            } else {
                $errMgs .= __( "Incorrect API password", 'arca-payment-gateway' ) . " - EUR<br>";
            }
        }

        // validate arca api PORT
        if( $arca_config->rest_serverID == 2 && ($arca_config->bankId != 10 && $bankId != 10 && $arca_config->bankId != 4 && $bankId != 4) ) {

            if(!empty($_POST["arca_test_api_port"]) && is_numeric($_POST["arca_test_api_port"])){
                $arca_test_api_port =  intval($_POST["arca_test_api_port"]);
            } else {
                $errMgs .= __( "Incorrect API Test Port:", 'arca-payment-gateway' ) . "<br>";
            }

        } else {
            $arca_test_api_port = 0;
        }

        // validate default_language
        if ( !empty($_POST["default_language"]) ) {
            $default_language = arca_pg_sanitize_input($_POST["default_language"]);
        } else {
            $errMgs .= __( "incorrect default_language", 'arca-payment-gateway' ) . "<br>";
        }

        // validate default_currency
        if ( !empty($_POST["default_currency"]) ) {
            $default_currency = arca_pg_sanitize_input($_POST["default_currency"]);
        } else{
            $errMgs .= __( "incorrect default_currency", 'arca-payment-gateway' ) . "<br>";
        }

        // validate orderNumberPrefix
        if ( !empty($_POST["orderNumberPrefix"]) ) {
            $orderNumberPrefix = arca_pg_sanitize_input($_POST["orderNumberPrefix"]);
        } else{
            $orderNumberPrefix = "";
        }

        // validate startOrderNumber
        if ( !empty($_REQUEST["startOrderNumber"]) && is_numeric($_REQUEST["startOrderNumber"]) ) {
            $startOrderNumber = intval($_REQUEST["startOrderNumber"]);
        } else {
            $startOrderNumber = 0;
        }

        // validate wc order status
        if ( !empty($_REQUEST["wc_order_status"]) ) {
            $wc_order_status = esc_attr($_REQUEST["wc_order_status"]);
        } else {
            $wc_order_status = "Processing";
        }

        // validate rest_serverID
        if ( !empty($_POST["rest_serverID"]) && is_numeric($_POST["rest_serverID"]) ) {
            $rest_serverID = intval($_POST["rest_serverID"]);
        } else {
            $errMgs .= __( "incorrect rest_serverID", 'arca-payment-gateway' ) . "<br>";
        }

        // validate bankId
        if ( !empty($_POST["bankId"]) && is_numeric($_POST["bankId"]) ) {
            $bankId = intval($_POST["bankId"]);
        } else {
            $bankId = 0;
        }

        // validate ameriabankClientID
        if( $arca_config->bankId == 10 && $bankId == 10 ) {

            if(!empty($_POST["ameriabankClientID"])){
                $ameriabankClientID =  arca_pg_sanitize_input($_POST["ameriabankClientID"]);
            } else {
                $errMgs .= __( "Incorrect ameriabankClientID", 'arca-payment-gateway' ) . "<br>";
            }

        } else {
            $ameriabankClientID = "";
        }

        // validate ameriabankMinTestOrderId
        if ( !empty($_POST["ameriabankMinTestOrderId"]) && is_numeric($_POST["ameriabankMinTestOrderId"]) ) {
            $ameriabankMinTestOrderId = intval($_POST["ameriabankMinTestOrderId"]);
        } else {
            $ameriabankMinTestOrderId = 0;
        }

        // validate ameriabankMaxTestOrderId
        if ( !empty($_POST["ameriabankMaxTestOrderId"]) && is_numeric($_POST["ameriabankMaxTestOrderId"]) ) {
            $ameriabankMaxTestOrderId = intval($_POST["ameriabankMaxTestOrderId"]);
        } else {
            $ameriabankMaxTestOrderId = 0;
        }

        if( $errMgs == "" ) {

            // update configs
            $table = $wpdb->prefix.'arca_pg_config';
            $data = array(
                'vpos_accuonts'				=> json_encode($apg_vpos_accuonts),
                'default_language'			=> $default_language,
                'default_currency'			=> $default_currency,
                'orderNumberPrefix'			=> $orderNumberPrefix,
                'ameriabankClientID'		=> $ameriabankClientID,
                'ameriabankMinTestOrderId'	=> $ameriabankMinTestOrderId,
                'ameriabankMaxTestOrderId'	=> $ameriabankMaxTestOrderId,
                'arca_test_api_port'		=> $arca_test_api_port,
                'wc_order_status'			=> $wc_order_status,
            );

            $data_format = array('%s', '%s', '%s', '%s', '%s', '%d', '%d', '%d', '%s');
            $where = array('rest_serverID' => $rest_serverID);
            $where_format = array('%d');
            $wpdb->update( $table, $data, $where, $data_format, $where_format );

            // set start orders number if startOrderNumber exist
            if ( $startOrderNumber > $arca_config->startOrderNumber ) {

                // alter table
                $wpdb->query(
                    $wpdb->prepare(
                        "ALTER TABLE {$wpdb->prefix}arca_pg_orders AUTO_INCREMENT = %d",
                        $startOrderNumber
                    )
                );

                // update config startOrderNumber for display only
                $wpdb->query(
                    $wpdb->prepare(
                        "UPDATE {$table} SET startOrderNumber = %d",
                        $startOrderNumber
                    )
                );

            }

            $wpdb->query(
                $wpdb->prepare(
                    "UPDATE {$table} SET bankId = %d",
                    $bankId
                )
            );


            $strMgs = __( "Done!", 'arca-payment-gateway' );
        }

        // switch work server
    } elseif ( $act == "switch-server" ) {

        // validate rest_serverID
        if ( !empty($_POST["rest_serverID"]) && is_numeric($_POST["rest_serverID"]) ) {
            $rest_serverID = intval($_POST["rest_serverID"]);
        } else {
            $errMgs .= __( "incorrect rest_serverID", 'arca-payment-gateway' ) . "<br>";
        }

        // switch rest server

        // reset all
        $wpdb->query(
            $wpdb->prepare(
                "UPDATE {$wpdb->prefix}arca_pg_config SET active = %d",
                0 // Значение для поля active
            )
        );

        // set one
        $wpdb->query(
            $wpdb->prepare(
                "UPDATE {$wpdb->prefix}arca_pg_config SET active = 1 WHERE rest_serverID = %d",
                $rest_serverID
            )
        );

        $strMgs = __( "Done!", 'arca-payment-gateway' );

    }

}

// sanitize form data
function arca_pg_sanitize_input($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data);
    return $data;
}

// ArCa Payments Gateway configs
$arca_config = $wpdb->get_row(
    $wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}arca_pg_config WHERE active = %d",
        1
    )
);


// get vPOS accounts
$apg_vpos_accuonts = json_decode( $arca_config->vpos_accuonts, true );

$apg_hide_if_not_ameria = ($arca_config->bankId != 10) ? "apg-hidden": "";
?>

<div class="wrap apg" id="apg-config">

    <h1>
        <?php esc_html_e("vPOS Settings", 'arca-payment-gateway' ) ?>
        <span class="apg-test-mode">
            <?php if ( $arca_config->rest_serverID == 2 ) { esc_html_e("TEST MODE", 'arca-payment-gateway' ); } ?>
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

        <?php
        $row = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM {$wpdb->prefix}arca_pg_config WHERE active = %d",
                1
            ),
            ARRAY_A
        );
        ?>

        <br>

        <form action="" method="post">

            <legend><?php esc_html_e("Bank:", 'arca-payment-gateway' ) ?></legend>
            <select name="bankId" id="apg-bank-switcher">
                <option value="0"></option>
                <?php
                $arca_banks = $wpdb->get_results(
                    $wpdb->prepare(
                        "SELECT * FROM {$wpdb->prefix}arca_pg_banks WHERE bankId <> %d ORDER BY bankName ASC",
                        12
                    )
                );

                if( $arca_banks ) {
                    foreach ( $arca_banks as $arca_bank ) {
                        echo "<option " . (($arca_bank->bankId == $arca_config->bankId) ? 'selected' : '') ." value='".esc_attr($arca_bank->bankId)."'>".esc_html($arca_bank->bankName)."</option>";
                    }
                }
                ?>
            </select>
            <?php if($arca_config->bankId > 0){ ?>
                <img class='bank-logo' src='<?php echo esc_url(ARCAPG_URL . "/images/bank-logos/" . $arca_config->bankId . ".png"); ?>'>
            <?php } ?>

            <div class="<?php echo esc_attr($apg_hide_if_not_ameria); ?> apg-ameria-fields">
                <legend><?php esc_html_e("Client ID:", 'arca-payment-gateway' ) ?></legend>
                <input type="text" name="ameriabankClientID" value="<?php echo esc_attr($row["ameriabankClientID"]); ?>">
            </div>

            <?php
            // create accounts forms for currencies
            $currencies = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT code, abbr FROM {$wpdb->prefix}arca_pg_currency WHERE active = %d",
                    1
                )
            );

            foreach ($currencies as $currency) {
                ?>

                <h3 class="apg-vpos-login-pass-caption"><?php esc_html_e("vPOS Account", 'arca-payment-gateway' ); ?> <?php echo esc_html($currency->abbr); ?></h3>

                <legend><?php esc_html_e("API username:", 'arca-payment-gateway' ) ?></legend>
                <input type="text" name="<?php echo esc_attr(strtolower($currency->abbr)); ?>_api_userName" value="<?php echo esc_attr($apg_vpos_accuonts[$currency->code]["api_userName"]); ?>" autocomplete="off">

                <legend><?php esc_html_e("API password:", 'arca-payment-gateway' ) ?></legend>
                <div class="api-password-container">
                    <input type="password" name="<?php echo esc_attr(strtolower($currency->abbr)); ?>_api_password" class="api-password" value="<?php echo esc_attr($apg_vpos_accuonts[$currency->code]["api_password"]); ?>" autocomplete="new-password">
                    <span class="show-hide"></span>
                </div>

                <?php
            }
            ?>

            <div class="apg-saperator"></div>

            <br>

            <?php
            // if not AmeriaBank or Inecobank
            if($arca_config->bankId != 10 && $arca_config->bankId != 4 && $arca_config->rest_serverID == 2){ ?>

                <legend><?php esc_html_e("API Test Port:", 'arca-payment-gateway' ) ?></legend>
                <input type="text" name="arca_test_api_port" value="<?php echo intval($row["arca_test_api_port"]); ?>">
            <?php } ?>

            <legend><?php esc_html_e("Default language:", 'arca-payment-gateway' ) ?></legend>
            <select name="default_language">
                <?php
                $arca_languages = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}arca_pg_language ORDER BY language");
                if( $arca_languages ) {
                    foreach ( $arca_languages as $language ) {
                        echo "<option " . (($row["default_language"] == $language->code) ? 'selected' : '') ." value='". esc_attr($language->code) ."'>". esc_html($language->code ." - ". $language->language) ."</option>";
                    }
                }
                ?>
            </select>

            <legend><?php esc_html_e("Default currency:", 'arca-payment-gateway' ) ?></legend>
            <select name="default_currency">
                <?php
                $arca_currencies = $wpdb->get_results(
                    $wpdb->prepare(
                        "SELECT * FROM {$wpdb->prefix}arca_pg_currency WHERE active = %d ORDER BY code",
                        1
                    )
                );

                if( $arca_currencies ) {
                    foreach ( $arca_currencies as $currency ) {
                        echo "<option " . (($row["default_currency"] == $currency->code) ? 'selected' : '') ." value='". esc_attr($currency->code) ."'>". esc_html($currency->abbr ." - ". $currency->name) ."</option>";
                    }
                }
                ?>
            </select>

            <?php
            // if not AmeriaBank
            if($arca_config->bankId != 10){ ?>
                <legend><?php esc_html_e("Orders number prefix:", 'arca-payment-gateway' ) ?></legend>
                <input type="text" name="orderNumberPrefix" value="<?php echo esc_attr($row["orderNumberPrefix"]); ?>">
            <?php } ?>

            <?php
            // if not AmeriaBank or AmeriaBank and real server
            if($arca_config->bankId != 10 || ($arca_config->bankId == 10 && $arca_config->rest_serverID == 1)){ ?>
                <legend><?php esc_html_e("Order number starting from", 'arca-payment-gateway' ) ?></legend>
                <input type="text" name="startOrderNumber" value="<?php echo esc_attr($row["startOrderNumber"]); ?>">
                <p class="description"><?php esc_html_e("Orders will increase starting from the specified number, the type must be integer (for example, 100).", 'arca-payment-gateway' ) ?></p>
            <?php } ?>

            <?php
            // if AmeriaBank and test server
            if($arca_config->bankId == 10 && $arca_config->rest_serverID == 2){ ?>

                <legend><?php esc_html_e("Start of the OrderID range in the test mode:", 'arca-payment-gateway' ) ?></legend>
                <input type="text" name="ameriabankMinTestOrderId" value="<?php echo esc_attr($row["ameriabankMinTestOrderId"]); ?>">

                <legend><?php esc_html_e("End of the OrderID range in the test mode:", 'arca-payment-gateway' ) ?></legend>
                <input type="text" name="ameriabankMaxTestOrderId" value="<?php echo esc_attr($row["ameriabankMaxTestOrderId"]); ?>">
            <?php } ?>

            <?php if ( class_exists('woocommerce') ) { ?>
                <legend><?php esc_html_e("WooCommerce order status:", 'arca-payment-gateway' ) ?></legend>
                <select name="wc_order_status">
                    <option value="processing" <?php echo ($row["wc_order_status"] == "processing") ? 'selected' : ''; ?>>Processing</option>
                    <option value="completed" <?php echo ($row["wc_order_status"] == "completed") ? 'selected' : ''; ?>>Completed</option>
                </select>
            <?php } ?>

            <br>

            <?php apg_wp_nonce_field(); ?>
            <input type="hidden" name="rest_serverID" value="<?php echo esc_attr($row["rest_serverID"]); ?>">
            <input type="hidden" name="act" value="save">
            <input class="submitLink button-primary" type="submit" value="<?php esc_html_e("Save", 'arca-payment-gateway' )?>">

        </form>

        <br>
        <h2><?php esc_html_e("Working mode", 'arca-payment-gateway' ) ?></h2>

        <form method="post" class="mode-switcher">
            <?php
            $result = $wpdb->get_results("select rest_serverID, rest_serverName, active from ".$wpdb->prefix."arca_pg_config");
            if ( $result ) {
                foreach ( $result as $row ) {
                    echo "<input type='radio' name='rest_serverID' " . (($row->active == 1) ? 'checked' : '') ." value='$row->rest_serverID'> $row->rest_serverName ";
                }
            }
            ?>
            <span class="actions">
            <?php apg_wp_nonce_field(); ?>
			<input type="hidden" name="act" value="switch-server">
			<input class="submitLink button-primary" type="submit" value="<?php _e( "Switch", 'apg' ) ?>">
		</span>
        </form>

    </div>

</div>
