<?php
if ( ! defined( 'ABSPATH' ) ) exit;

global $wpdb, $arca_config;

if ( ARCAPG_PRO ) {

    // reset last check date
    $apg_options = get_option('apg_options');
    $apg_options['date'] = 0;
    update_option('apg_options', $apg_options);

}

// array to table
function arca_pg_array2table( $array, $recursive = false, $null = '&nbsp;' )
{
    // Sanity check
    if ( empty($array) || !is_array($array) ) {
        return false;
    }
    if ( !isset($array[0]) || !is_array($array[0]) ) {
        $array = array($array);
    }
    // Start the table
    $table = "<table>\n";
    // The header
    $table .= "\t<tr>";
    // Take the keys from the first row as the headings
    foreach ( array_keys($array[0]) as $heading ) {
        $table .= '<th>' . $heading . '</th>';
    }
    $table .= "</tr>\n";
    // The body
    foreach ( $array as $row ) {
        $table .= "\t<tr>";
        foreach ( $row as $cell ) {
            $table .= '<td>';
            // Cast objects
            if ( is_object($cell) ) {
                $cell = (array) $cell;
            }
            if ( $recursive === true && is_array($cell) && !empty($cell) ) {
                // Recursive mode
                $table .= "\n" . arca_pg_array2table($cell, true, true) . "\n";
            } else {
                $table .= strlen($cell ?? '') > 0 ? htmlspecialchars((string) $cell) : $null;
            }
            $table .= '</td>';
        }
        $table .= "</tr>\n";
    }
    $table .= '</table>';
    return $table;
}

?>

<div class="wrap apg" id="apg-dashboard">

    <h1>
        <?php esc_html_e("Dashboard", 'arca-payment-gateway' ) ?>
        <span class="apg-test-mode">
            <?php if ( $arca_config->rest_serverID == 2 ) { esc_html_e("TEST MODE", 'arca-payment-gateway' ); } ?>
        </span>
    </h1>

    <div class="apg-main-container">

        <h2><?php esc_html_e("Gateway status", 'arca-payment-gateway' ) ?></h2>

        <?php
        if ( ARCAPG_PRO ) {
            do_action('apg_activate_form');
        }
        ?>

        <span><?php esc_html_e("Plugin version:", 'arca-payment-gateway' ) ?> </span>
        <?php echo esc_html(ARCAPG_VERSION); ?>

        <div class="apg-saperator"></div>

        <?php
        // ArCa Payments Gateway configs
        $arca_config = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM {$wpdb->prefix}arca_pg_config WHERE active = %d",
                1
            )
        );

        // get vPOS accounts
        $apg_vpos_accuonts = json_decode( $arca_config->vpos_accuonts, true );

        // Idram configs
        $arca_idram_config = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM {$wpdb->prefix}arca_pg_idram_config WHERE id = %d",
                1
            )
        );

        ?>


        <span><?php esc_html_e("Bank:", 'arca-payment-gateway' ) ?> </span>
        <?php
        // get bank name
        $bank_name = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT bankName FROM " . $wpdb->prefix . "arca_pg_banks WHERE bankId = %d",
                $arca_config->bankId
            )
        );

        echo esc_html($bank_name); ?>

        <br>

        <span><?php esc_html_e("Active currencies:", 'arca-payment-gateway' ) ?> </span>
        <?php
        // get Bank vPOS active accounts
        $currencies = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT code, abbr FROM " . $wpdb->prefix . "arca_pg_currency WHERE active = %d",
                1
            )
        );

        foreach ($currencies as $currency) {
            echo esc_html($currency->abbr) . " ";
        }?>

        <br>

        <span><?php esc_html_e("Default currency:", 'arca-payment-gateway' ) ?> </span>
        <?php
        $currency = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT abbr FROM " . $wpdb->prefix . "arca_pg_currency WHERE code = %s",
                $arca_config->default_currency
            )
        );

        echo esc_html($currency); ?>

        <br>

        <span><?php esc_html_e("Default language:", 'arca-payment-gateway' ) ?> </span>
        <?php
        $language = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT language FROM " . $wpdb->prefix . "arca_pg_language WHERE code = %s",
                $arca_config->default_language
            )
        );

        echo esc_html($language); ?>

        <br>

        <span><?php esc_html_e("Working mode:", 'arca-payment-gateway' ) ?> </span>
        <?php echo ($arca_config->rest_serverID == 2) ? esc_html__( "Test server", 'arca-payment-gateway' ) : esc_html__( "Real server", 'arca-payment-gateway' ) ?>


        <div class="apg-saperator"></div>

        <span><?php esc_html_e("Idram status:", 'arca-payment-gateway' ) ?> </span>
        <?php echo ($arca_idram_config->idramEnabled) ? esc_html__( "Enabled", 'arca-payment-gateway' ) : esc_html__( "Disabled", 'arca-payment-gateway' ) ?>

        <br>

        <span><?php esc_html_e("Idram test mode:", 'arca-payment-gateway' ) ?> </span>
        <?php echo ($arca_idram_config->testMode) ? esc_html__( "Enabled", 'arca-payment-gateway' ) : esc_html__( "Disabled", 'arca-payment-gateway' ) ?>

        <br>

        <span><?php esc_html_e("Roket Line:", 'arca-payment-gateway' ) ?> </span>
        <?php echo ($arca_idram_config->rocketLine) ? esc_html__( "Enabled", 'arca-payment-gateway' ) : esc_html__( "Disabled", 'arca-payment-gateway' ) ?>


        <br>
        <br>

        <h2><?php esc_html_e("Finance report", 'arca-payment-gateway' ) ?></h2>
        <?php

        $sql_if = "";
        $sql = "";
        $prepareParams = array();
        $result = $wpdb->get_results(
            "SELECT code, abbr FROM {$wpdb->prefix}arca_pg_currency WHERE active = 1"
        );

        foreach ($result as $row) {
            $sql_if .= ", SUM(IF(currency = '%s', amount, 0)) AS '%s'";
            $prepareParamsif[] = $row->code;
            $prepareParamsif[] = $row->abbr;
        }

        $prepareParams = $prepareParamsif;
        $prepareParams[] = $arca_config->rest_serverID;
        $prepareParams = array_merge($prepareParams,$prepareParamsif);
        $prepareParams[] = $arca_config->rest_serverID;
        $prepareParams = array_merge($prepareParams,$prepareParamsif);
        $prepareParams[] = $arca_config->rest_serverID;
        $prepareParams = array_merge($prepareParams,$prepareParamsif);
        $prepareParams[] = $arca_config->rest_serverID;
        $prepareParams = array_merge($prepareParams,$prepareParamsif);
        $prepareParams[] = $arca_config->rest_serverID;
        $sql .= "SELECT ('" . __( "Today:", 'arca-payment-gateway' ) . "') as " . __( "Orders", 'arca-payment-gateway' ) . ", count(orderNumber) as " . __( "Count", 'arca-payment-gateway' ) . " $sql_if FROM ".$wpdb->prefix."arca_pg_orders WHERE DATE(orderDate) = CURDATE() AND (paymentState = 'DEPOSITED' OR paymentState = 'Successful' ) AND rest_serverID = '%d'";
        $sql .= " UNION ";
        $sql .= "SELECT ('" . __( "This week:", 'arca-payment-gateway' ) . "') as " . __( "Orders", 'arca-payment-gateway' ) . ", count(orderNumber) as " . __( "Count", 'arca-payment-gateway' ) . " $sql_if FROM ".$wpdb->prefix."arca_pg_orders WHERE  YEARWEEK(orderDate, 1) = YEARWEEK(CURDATE(), 1)	AND (paymentState = 'DEPOSITED' OR paymentState = 'Successful' ) AND rest_serverID = '%d'";
        $sql .= " UNION ";
        $sql .= "SELECT ('" . __( "Last week:", 'arca-payment-gateway' ) . "') as " . __( "Orders", 'arca-payment-gateway' ) . ", count(orderNumber) as " . __( "Count", 'arca-payment-gateway' ) . " $sql_if FROM ".$wpdb->prefix."arca_pg_orders WHERE orderDate >= now() - INTERVAL DAYOFWEEK(now())+6 DAY AND orderDate < now() - INTERVAL DAYOFWEEK(now())-1 DAY AND (paymentState = 'DEPOSITED' OR paymentState = 'Successful' ) AND rest_serverID = '%d'";
        $sql .= " UNION ";
        $sql .= "SELECT ('" . __( "Last month:", 'arca-payment-gateway' ) . "') as " . __( "Orders", 'arca-payment-gateway' ) . ", count(orderNumber) as " . __( "Count", 'arca-payment-gateway' ) . " $sql_if FROM ".$wpdb->prefix."arca_pg_orders WHERE YEAR(orderDate) = YEAR(CURRENT_DATE - INTERVAL 1 MONTH) AND MONTH(orderDate) = MONTH(CURRENT_DATE - INTERVAL 1 MONTH) AND (paymentState = 'DEPOSITED' OR paymentState = 'Successful' ) AND rest_serverID = '%d'";
        $sql .= " UNION ";
        $sql .= "SELECT ('" . __( "All time:", 'arca-payment-gateway' ) . "') as " . __( "Orders", 'arca-payment-gateway' ) . ", count(orderNumber) as " . __( "Count", 'arca-payment-gateway' ) . " $sql_if FROM ".$wpdb->prefix."arca_pg_orders WHERE (paymentState = 'DEPOSITED' OR paymentState = 'Successful' ) AND rest_serverID = '%d'";
        $report = $wpdb->get_results( $wpdb->prepare($sql, $prepareParams), ARRAY_A );

        echo wp_kses_post(arca_pg_array2table($report));
        ?>
    </div>

</div>
