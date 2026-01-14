<?php
if ( ! defined( 'ABSPATH' ) ) exit;

global $wpdb, $arca_config;

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
                $table .= (is_string($cell) && strlen($cell) > 0) ? htmlspecialchars($cell) : $null;
            }
            $table .= '</td>';
        }
        $table .= "</tr>\n";
    }
    $table .= '</table>';
    return $table;
}

?>

<div class="apg-dashboard-widgets" id="apg-dashboard-widget_1">

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
