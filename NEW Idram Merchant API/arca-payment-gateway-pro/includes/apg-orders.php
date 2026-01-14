<?php
if ( ! defined( 'ABSPATH' ) ) exit;

// wp verify nonce
require_once ('apg-wp-verify-nonce.php');

global $wpdb, $arca_config;

// set admin visit date
$wpdb->query("UPDATE {$wpdb->prefix}arca_pg_config SET adminLastVisitDate = NOW() WHERE active = 1");

// get test or real logs
$rest_serverID = ( isset($_GET["rest_serverID"]) && is_numeric($_GET["rest_serverID"]) ) ? intval($_GET["rest_serverID"]) : $arca_config->rest_serverID ;

$act = (isset($_GET["act"])) ? sanitize_text_field($_GET["act"]) : "";
$orderNumber = (isset($_GET["orderNumber"]) && is_numeric($_GET["orderNumber"])) ? intval($_GET["orderNumber"]) : 0;
$strMgs = $errMgs = "";

if ( $act == "delete" ) {

    $wpdb->query(
        $wpdb->prepare(
            "DELETE FROM {$wpdb->prefix}arca_pg_orders WHERE orderNumber = %d",
            $orderNumber
        )
    );
    $strMgs = __( "Done!", 'arca-payment-gateway' );

} else if ( $act == "delete_all" ){

    $wpdb->query("DELETE FROM {$wpdb->prefix}arca_pg_orders");
    $strMgs = __( "Done!", 'arca-payment-gateway' );

} else if ( $act == 'refundPayment' ) {

    $orderId = sanitize_text_field( $_GET['orderId'] ?? null );
    if ( $orderId ) {
        require_once ('apg_REFUND.php');
        $refund = new apgREFUND();
        $strMgs = $refund->refundPayment($orderId);
    } else {
        $strMgs = __( "Order id not set", 'arca-payment-gateway' );
    }

} else if ( $act == 'cancelPayment' ) {

    $orderId = sanitize_text_field( $_GET['orderId'] ?? null );
    if ( $orderId ) {
        require_once ('apg_REFUND.php');
        $refund = new apgREFUND();
        $strMgs = $refund->cancelPayment($orderId);
    } else {
        $strMgs = __( "Order id not set", 'arca-payment-gateway' );
    }

}
?>

<div id="apg-jsonView" class="apg-popup">
    <span class="popupClose"><?php esc_html_e("Close", 'arca-payment-gateway' )?></span>
    <textarea readonly></textarea>
</div>

<div class="wrap apg" id="apg-orders">


    <h1>
        <?php esc_html_e("Order log", 'arca-payment-gateway' ) ?>
        <span class="apg-test-mode">
            <?php if ( $arca_config->rest_serverID == 2 ) { esc_html_e("TEST MODE", 'arca-payment-gateway' ); } ?>
        </span>
    </h1>

    <?php
    if ($arca_config->bankId == 10){
        $arca_adminPageUrl = "https://". (($arca_config->rest_serverID == 2) ? "test" : "") ."payments.ameriabank.am/admin/clients";
    } elseif($arca_config->bankId == 4){
        $arca_adminPageUrl = "https://pg.inecoecom.am/admin/";
    } else {
        $arca_adminPageUrl = "https://ipay". (($arca_config->rest_serverID == 2) ? "test" : "") .".arca.am:". (($arca_config->rest_serverID == 2) ? "8444" : "") ."/payment/admin";
    }
    ?>
    <p><a href="<?php echo esc_url($arca_adminPageUrl);?>" target="_blank"><?php esc_html_e("ArCa admin panel", 'arca-payment-gateway' ) ?></a></p>

    <p>
        <?php
        if ( $errMgs != "" || $strMgs != "" ){
            echo wp_kses_post($errMgs), wp_kses_post($strMgs);
        }
        ?>
    </p>

    <div class="apg-main-container">

        <p>
            <?php if ((ARCAPG_DELETE_DATA_ACTIONS == true || $arca_config->rest_serverID = 2) && $rest_serverID != 1) { ?>
                <a style="margin-right:20px" class="linkDelate button" onclick="return confirmDelete();" href="<?php echo esc_url("?page=orderlog&act=delete_all"); apg_wp_nonce_arg();?>">
                    <?php esc_html_e("Delete All", 'arca-payment-gateway' ); ?>
                </a>
            <?php } ?>

            <a class="button<?php echo (($rest_serverID == 1) ? '-primary' : ''); ?>" href="<?php echo esc_url("?page=orderlog&rest_serverID=1"); ?>">
                <?php esc_html_e("Real Orders", 'arca-payment-gateway' ); ?>
            </a>
            <a class="button<?php echo (($rest_serverID == 2) ? '-primary' : ''); ?>" href="<?php echo esc_url("?page=orderlog&rest_serverID=2"); ?>">
                <?php esc_html_e("Test Orders", 'arca-payment-gateway' ); ?>
            </a>
        </p>

        <div class="apg-table-container apg-scroll-container">

            <table>
                <tr>
                    <th><?php esc_html_e("Order number", 'arca-payment-gateway' ) ?></th>
                    <th><?php esc_html_e("Order id", 'arca-payment-gateway' ) ?></th>
                    <th><?php esc_html_e("Bank", 'arca-payment-gateway' ) ?></th>
                    <th><?php esc_html_e("Product id", 'arca-payment-gateway' ) ?></th>
                    <th><?php esc_html_e("WC order", 'arca-payment-gateway' ) ?></th>
                    <th><?php esc_html_e("Amount", 'arca-payment-gateway' ) ?></th>
                    <th><?php esc_html_e("Currency", 'arca-payment-gateway' ) ?></th>
                    <th><?php esc_html_e("Error code", 'arca-payment-gateway' ) ?></th>
                    <th><?php esc_html_e("Payment state", 'arca-payment-gateway' ) ?></th>
                    <th><?php esc_html_e("Order date", 'arca-payment-gateway' ) ?></th>
                    <th><?php esc_html_e("eHDM Receipt QR", 'arca-payment-gateway' ) ?></th>
                    <th><?php esc_html_e("Email sent", 'arca-payment-gateway' ) ?></th>
                    <th><?php esc_html_e("Order status", 'arca-payment-gateway' ) ?></th>
                    <th><?php esc_html_e("Order details", 'arca-payment-gateway' ) ?></th>
                    <th><?php esc_html_e("Actions", 'arca-payment-gateway' )?></th>
                </tr>

                <?php
                $p =  ( isset($_REQUEST['p']) ) ? intval($_REQUEST['p']) : 1;
                $results_per_page = 15;
                $page_first_result = ($p-1) * $results_per_page;

                $results = $wpdb->get_results(
                    $wpdb->prepare(
                        "SELECT * FROM {$wpdb->prefix}arca_pg_orders WHERE rest_serverID = %d",
                        $rest_serverID
                    )
                );
                $number_of_result = $wpdb->num_rows;

                $number_of_page = ceil ($number_of_result / $results_per_page);

                $result = $wpdb->get_results(
                    $wpdb->prepare(
                        "SELECT o.*, b.bankName 
                         FROM {$wpdb->prefix}arca_pg_orders AS o
                         LEFT JOIN {$wpdb->prefix}arca_pg_banks AS b 
                         ON o.bankId = b.bankId
                         WHERE o.rest_serverID = %d 
                         ORDER BY o.orderDate DESC 
                         LIMIT %d, %d",
                        $rest_serverID, $page_first_result, $results_per_page
                    )
                );

                function getPaymentStateClass( $paymentState )
                {
                    $paymentStates = [
                        'DECLINED' => 'paymentStateDECLINED',
                        'REFUNDED' => 'paymentStateREFUNDED',
                        'Refunded' => 'paymentStateREFUNDED',
                        'Registered' => '',
                        'Successful' => '',
                        'Canceled' => 'paymentStateCanceled',
                        'DEPOSITED' => '',
                        'Registration failed' => 'paymentStateFailed',
                        'Failed' => 'paymentStateFailed',
                    ];
                    return $paymentStates[$paymentState] ?? null;
                }

                foreach ( $result as $row ) {
                    ?>
                    <tr>
                        <td><?php echo esc_html($row->orderNumber); ?></td>
                        <td><?php echo esc_html($row->orderId); ?></td>
                        <td><?php echo esc_html($row->bankName); ?></td>
                        <td><?php echo esc_html($row->productId); ?></td>
                        <td><?php echo esc_html($row->wc_orderId); ?></td>
                        <td><?php echo esc_html($row->amount); ?></td>
                        <td><?php echo esc_html($row->currency); ?></td>
                        <td><?php echo esc_html($row->errorCode); ?></td>
                        <td class="<?php echo esc_html(getPaymentStateClass($row->paymentState)); ?>"><?php echo esc_html($row->paymentState); ?></td>
                        <td><?php echo esc_html($row->orderDate); ?></td>

                        <td class="qr">
                            <?php
                            if( has_action('eHDM-getReceiptQR') ){

                                // get receiptId by orderId
                                $table_name = $wpdb->prefix . 'ehdm_receipts';
                                $receiptId = $wpdb->get_var("SELECT receiptId FROM $table_name WHERE orderId = '$row->orderId'" );

                                if( $receiptId ) {
                                    $ehdm_qr_url = apply_filters('eHDM-getReceiptQR', $receiptId, true);
                                    if ( $ehdm_qr_url ) { ?>
                                        <a href="<?php echo $ehdm_qr_url; ?>" target="_blank"><span class="dashicons dashicons-format-image"></span></a>
                                    <?php }
                                }

                            } ?>
                        </td>

                        <td class="center"><?php echo ($row->mailSent) ? '<span class="dashicons dashicons-yes-alt"></span>' : ''; ?></td>
                        <td <?php echo (!empty($row->OrderStatusExtended)) ? "class='jsonView center'" : '' ?>>
                            <?php if(!empty($row->OrderStatusExtended)){ ?>
                                <span class="dashicons dashicons-media-text"></span>
                                <span class="jsonData hidden"><?php echo wp_kses_post(htmlentities($row->OrderStatusExtended)); ?></span>
                            <?php } ?>
                        </td>
                        <td <?php echo (!empty($row->orderDetails)) ? "class='jsonView center'" : '' ?>>
                            <?php if(!empty($row->orderDetails)){ ?>
                                <span class="dashicons dashicons-media-text"></span>
                                <span class="jsonData hidden"><?php echo wp_kses_post(htmlentities($row->orderDetails)); ?></span>
                            <?php } ?>
                        </td>
                        <td class="actions">

                            <?php if ( ($arca_config->bankId == $row->bankId || $row->bankId == 12) && ($row->paymentState == 'Successful' || $row->paymentState == 'DEPOSITED' ) ) { ?>

                                <a class="button" onclick="return apg_confirmAction();" href="<?php echo esc_url("?page=orderlog&act=refundPayment&rest_serverID=$rest_serverID&p=$p&orderId=$row->orderId"); apg_wp_nonce_arg(); ?>">Refund</a>
                                <?php if ( $arca_config->bankId != '12' ) { ?>
                                    <a class="button" onclick="return apg_confirmAction();" href="<?php echo esc_url("?page=orderlog&act=cancelPayment&rest_serverID=$rest_serverID&p=$p&orderId=$row->orderId"); apg_wp_nonce_arg(); ?>">Cancel</a>
                                <?php } ?>

                            <?php } else { ?>

                                <a class="button disabled">Refund</a>
                                <?php if ( $arca_config->bankId != '12' ) { ?>
                                    <a class="button disabled">Cancel</a>
                                <?php } ?>

                            <?php } ?>

                            <?php if ((ARCAPG_DELETE_DATA_ACTIONS == true || $arca_config->rest_serverID = 2) && $rest_serverID != 1) { ?>
                                <a class="linkDelate button" onclick="return confirmDelete();" href="<?php echo esc_url("?page=orderlog&act=delete&rest_serverID=$rest_serverID&p=$p&orderNumber=$row->orderNumber"); apg_wp_nonce_arg(); ?>"><?php esc_html_e("Delete", 'arca-payment-gateway' )?></a>
                            <?php } ?>
                        </td>
                    </tr>
                    <?php
                }
                ?>
            </table>
        </div>
    </div>

    <div id="apg-pagination">
        <?php
        for($i = 1; $i <= $number_of_page; $i++) {
            $class = ($i == $p) ? "class=current" : "";
            echo "<a ". esc_attr($class) ." href='?page=orderlog&p=".esc_attr($i)."&rest_serverID=".esc_attr($rest_serverID)."'>".esc_attr($i)."</a>";
        }
        ?>
    </div>

</div>
