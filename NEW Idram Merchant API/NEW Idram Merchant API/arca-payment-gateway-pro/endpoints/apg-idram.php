<?php
if ( ! defined( 'ABSPATH' ) ) exit;

global $wpdb, $arca_idram_config;

$arca_process = (isset($_REQUEST["arca_process"])) ? sanitize_text_field($_REQUEST["arca_process"]) : null;

define( "SECRET_KEY", (($arca_idram_config->testMode) ? $arca_idram_config->idramTestKey : $arca_idram_config->idramKey) );
define( "EDP_REC_ACCOUNT", (($arca_idram_config->testMode) ? $arca_idram_config->idramTestID : $arca_idram_config->idramID) );


add_action('woocommerce_api_idram_result', 'apg_wc_api_idram_result' );
add_action('woocommerce_api_idram_complete', 'apg_wc_api_idram_complete' );
add_action('woocommerce_api_idram_fail', 'apg_wc_api_idram_fail' );

if ( !class_exists('woocommerce') ) {
    add_filter( 'request', function($query_vars){
        if( isset($query_vars['wc-api']) ){
            do_action( 'woocommerce_api_'. $query_vars['wc-api'] );
            die;
        }
        return $query_vars;
    });
}

function apg_wc_api_idram_result(){

    global $wpdb, $arca_idram_config;
    $request = $_REQUEST;

    $orderNumber = $orderId = ( !empty($request["EDP_BILL_NO"]) ) ? intval($request["EDP_BILL_NO"]) : -1;
    $wc_orderId		= 	( !empty($request["wc_orderId"]) ) ? intval($request["wc_orderId"]) : null;
    $gwp_donationId	= 	( !empty($request["gwp_donationId"]) ) ? intval($request["gwp_donationId"]) : null;

    if(isset($request['EDP_PRECHECK']) && isset($request['EDP_BILL_NO']) && isset($request['EDP_REC_ACCOUNT']) && isset($request['EDP_AMOUNT'])){
        if($request['EDP_PRECHECK'] == "YES") {
            if($request['EDP_REC_ACCOUNT'] == EDP_REC_ACCOUNT) {
                $bill_no = $request['EDP_BILL_NO'];

                // this code checks if $bill_no exists in your system orders if exists then echo OK otherwise
                $result = $wpdb->get_var(
                    $wpdb->prepare(
                        "SELECT COUNT(orderNumber) as x FROM {$wpdb->prefix}arca_pg_orders WHERE orderNumber = %d",
                        $orderNumber
                    )
                );
                if($result == 1){

                    $OrderStatusExtended = json_encode( array( "Request 1 - confirm" => $_REQUEST ) );

                    // update order row
                    $wpdb->query($wpdb->prepare(
                        "UPDATE " . $wpdb->prefix . "arca_pg_orders 
                        SET OrderStatusExtended = %s, paymentState = %s, orderId = %s 
                        WHERE orderNumber = %d",
                        $OrderStatusExtended,
                        'confirm 1',
                        $orderNumber, // если orderId и orderNumber совпадают
                        $orderNumber
                    ));

                    echo "OK";
                    die;

                } else {
                    echo "EDP_BILL_NO not found";
                    die;
                }

            }
        }
    }

    if(isset($request['EDP_PAYER_ACCOUNT']) && isset($request['EDP_BILL_NO']) && isset($request['EDP_REC_ACCOUNT']) && isset($request['EDP_AMOUNT']) && isset($request['EDP_TRANS_ID']) && isset($request['EDP_CHECKSUM'])) {
        $txtToHash = EDP_REC_ACCOUNT . ":" . $request['EDP_AMOUNT'] . ":" . SECRET_KEY . ":" . $request['EDP_BILL_NO'] . ":" . $request['EDP_PAYER_ACCOUNT'] . ":" . $request['EDP_TRANS_ID'] . ":" . $request['EDP_TRANS_DATE'];
        if(strtoupper($request['EDP_CHECKSUM']) != strtoupper(md5($txtToHash))) {

            // please, write your code here to handle the payment fail

            // get previous stored requests
            $OrderStatusExtended = json_decode(
                $wpdb->get_var(
                    $wpdb->prepare(
                        "SELECT OrderStatusExtended FROM {$wpdb->prefix}arca_pg_orders WHERE orderNumber = %s",
                        $orderId
                    )
                ),
                true
            );

            // add new request
            $OrderStatusExtended = array_merge($OrderStatusExtended, array( "Request 2 - fail" => $_REQUEST ) );

            $OrderStatusExtended = json_encode( $OrderStatusExtended );

            // update error number from REST system
            $wpdb->query($wpdb->prepare(
                "UPDATE " . $wpdb->prefix . "arca_pg_orders 
                SET OrderStatusExtended = %s, paymentState = %s 
                WHERE orderNumber = %d",
                $OrderStatusExtended,
                'fail',
                $orderNumber
            ));

            echo "EDP_CHECKSUM not correct";
            die;

        } else {

            // please, write your code here to handle the payment success echo("OK");

            // get order payment state from REST response
            $paymentState = "DEPOSITED";

            // get previous stored requests
            $OrderStatusExtended = json_decode(
                $wpdb->get_var(
                    $wpdb->prepare(
                        "SELECT OrderStatusExtended FROM {$wpdb->prefix}arca_pg_orders WHERE orderNumber = %s",
                        $orderId
                    )
                ),
                true
            );

            // add new request
            $OrderStatusExtended = array_merge($OrderStatusExtended, array( "Request 2 - confirm" => $_REQUEST ) );

            $OrderStatusExtended = json_encode( $OrderStatusExtended );

            // update order payment REST response data
            $wpdb->query($wpdb->prepare(
                "UPDATE " . $wpdb->prefix . "arca_pg_orders 
                SET OrderStatusExtended = %s, paymentState = %s 
                WHERE orderNumber = %d",
                $OrderStatusExtended,
                $paymentState,
                $orderId
            ));

            $wc_orderId = ( !empty($_REQUEST["wc_orderId"]) ) ? intval($_REQUEST["wc_orderId"]) : null;
            $gwp_donationId	= ( !empty($_REQUEST["gwp_donationId"]) ) ? intval($_REQUEST["gwp_donationId"]) : null;

            // if woocommerce
            if(isset($wc_orderId)) {

                // get wc order
                $apg_wc_order = wc_get_order($wc_orderId);

                // get ws order status processing or failed
                $apg_wc_orderStatus = ( $paymentState == 'DEPOSITED' ) ? $arca_idram_config->wc_order_status : 'failed';


                // eHDM print for woocommerce orders
                if( $paymentState == 'DEPOSITED' && has_action('eHDM-print') ) {

                    $wc_order_total = $apg_wc_order->get_total();

                    $cardAmount = $wc_order_total;          // Անկանխիկ վճարված գումար (double)
                    $cashAmount = 0;                        // Առձեռն /կանխիկ/ վճարված գումար (double)
                    $partialAmount = 0;                     // Մասնակի վճարման գումար (double)
                    $prePaymentAmount = 0;                  // Կանխավճարի օգտագործման գումար (double)
                    $cashierId = 1;                         // Գանձապահի համարը (int)
                    $mode = 2;                              // Կտրոնի տպման ռեժիմ: 2 – Ապրանքներ ռեժիմ 3 – Կանխավճար (int)
                    $partnerTin = null;                     // Գնորդի ՀՎՀՀ (string)

                    $items = apply_filters('eHDM-getWoocommersOrderItems', $wc_orderId); // Ապրանքների ցանկ (array)

                    do_action('eHDM-print',
                        [
                            'orderId' => $orderId,
                            'wc_orderId' => $wc_orderId,
                            'cardAmount' => $cardAmount,
                            'cashAmount' => $cashAmount,
                            'partialAmount' => $partialAmount,
                            'prePaymentAmount' => $prePaymentAmount,
                            'cashierId' => $cashierId,
                            'mode' => $mode,
                            'partnerTin' => $partnerTin,
                            'items' => $items,
                        ]
                    );
                }
                // end eHDM print


                // set wc order status
                $apg_wc_order->set_status($apg_wc_orderStatus, 'wc_apg_gatewey');
                $apg_wc_order->save();

                //$apg_wc_order->reduce_order_stock();
                WC()->cart->empty_cart();

                // set email sent if email exist in wc order
                $wpdb->query($wpdb->prepare(
                    "UPDATE {$wpdb->prefix}arca_pg_orders
                    SET mailSent = 1
                    WHERE orderNumber = %s",
                    $orderId
                ));

                // if give wp
            } else if(isset($gwp_donationId)){

                // get give wp order status publish or failed
                $apg_givewp_orderStatus = ( $paymentState == 'DEPOSITED' ) ? 'publish' : 'failed';

                // set give wp donate status
                give_update_payment_status( $gwp_donationId, $apg_givewp_orderStatus );

                // set email sent if email exist in wc order
                $wpdb->query($wpdb->prepare(
                    "UPDATE {$wpdb->prefix}arca_pg_orders
                    SET mailSent = 1
                    WHERE orderNumber = %s",
                    $orderId
                ));

                // if tatiosa_booking
            } else if(isset($tatiosa_booking_id)){

                // get ws order status processing or failed
                $apg_booking_orderStatus = 1; //booking status, 0 (cancelled), 1 (confirmed), 2 (new), 3 (request)
                $code = 0;

                if( $apg_booking_orderStatus == 1){

                    $tatiosa_booking_Key = wp_parse_url( get_site_url() )['host'];
                    $description = 'Paid via Credit Card';
                    $payment_status = 'Successful';

                    // get amount for $orderId from orders
                    $amount = $wpdb->get_var($wpdb->prepare("SELECT amount  from " . $wpdb->prefix . "arca_pg_orders where orderId = %s", $orderId));

                    // notify of payment status tatiosa.net
                    $booking_orderStatus_url =  "https://tatiosa.net/api/custompaymentgateway/notify.php";
                    $args = array(
                        'headers'     => array('Content-Type: text/html; charset=UTF-8'),
                        'body'        => array(
                            'key'       => $tatiosa_booking_Key,
                            'bookid'    => $tatiosa_booking_id,
                            'status'     => $apg_booking_orderStatus,
                            'amount'     => $amount,
                            'description' => $description,
                            'payment_status' => $payment_status,
                        ),
                        'method'      => 'POST',
                        'data_format' => 'body',
                    );
                    $response = wp_remote_post( $booking_orderStatus_url, $args );


                    // get booking system status
                    $code = wp_remote_retrieve_response_code( $response );
                    if($code != 200){
                        arca_pg_errorCatch("Booking system respons error: " . json_encode($response, JSON_UNESCAPED_UNICODE), $wc_orderId, $gwp_donationId);
                    }

                }

                // get previous stored requests
                $OrderStatusExtended = json_decode(
                    $wpdb->get_var(
                        $wpdb->prepare(
                            "SELECT OrderStatusExtended FROM {$wpdb->prefix}arca_pg_orders WHERE orderId = %s",
                            $orderId
                        )
                    ),
                    true
                );

                // add new request
                $OrderStatusExtended = array_merge($OrderStatusExtended, array( "Booking System Response 1" => json_decode('{"Status": '.$code.'}', true) ) );

                $OrderStatusExtended = json_encode( $OrderStatusExtended );

                // update order payment REST response data
                $wpdb->query($wpdb->prepare(
                    "UPDATE {$wpdb->prefix}arca_pg_orders
                    SET OrderStatusExtended = %s, paymentState = %s
                    WHERE orderId = %s",
                    $OrderStatusExtended,
                    $paymentState,
                    $orderId
                ));

            }

            // eHDM print for apg, tatiosa orders
            if( $paymentState == 'DEPOSITED' && has_action('eHDM-print') && !isset($gwp_donationId) ) {

                // get amount for $orderId from orders
                $amount = $wpdb->get_var($wpdb->prepare("SELECT amount  from " . $wpdb->prefix . "arca_pg_orders where orderId = %s", $orderId));
                if (!empty($amount)) {

                    $cardAmount = $amount;  // Անկանխիկ վճարված գումար (double)
                    $cashAmount = 0;        // Առձեռն /կանխիկ/ վճարված գումար (double)
                    $partialAmount = 0;     // Մասնակի վճարման գումար (double)
                    $prePaymentAmount = 0;  // Կանխավճարի օգտագործման գումար (double)
                    $cashierId = 1;         // Գանձապահի համարը (int)
                    $mode = 3;              // Կտրոնի տպման ռեժիմ: 2 – Ապրանքներ ռեժիմ 3 – Կանխավճար (int)
                    $partnerTin = null;     // Գնորդի ՀՎՀՀ (string)

                    do_action('eHDM-print',
                        [
                            'orderId' => $orderId,
                            'cardAmount' => $cardAmount,
                            'cashAmount' => $cashAmount,
                            'partialAmount' => $partialAmount,
                            'prePaymentAmount' => $prePaymentAmount,
                            'cashierId' => $cashierId,
                            'mode' => $mode,
                            'partnerTin' => $partnerTin,
                        ]
                    );
                }
            }
            // end eHDM print

            echo "OK";
            die;
        }
    }

}

function apg_wc_api_idram_complete(){

    global $wpdb;
    $request = $_REQUEST;

    $orderNumber = $orderId = ( !empty($request["EDP_BILL_NO"]) ) ? intval($request["EDP_BILL_NO"]) : -1;
    $wc_orderId		= 	( !empty($request["wc_orderId"]) ) ? intval($request["wc_orderId"]) : null;
    $gwp_donationId	= 	( !empty($request["gwp_donationId"]) ) ? intval($request["gwp_donationId"]) : null;

    // if woocommerce
    if(isset($wc_orderId)) {

        // get wc return url
        $wc_apg_gatewey = new wc_apg_gatewey();

        // get wc order
        $apg_wc_order = wc_get_order($wc_orderId);

        // redirect to final page with REST payment state
        wp_redirect( $wc_apg_gatewey->get_return_url( $apg_wc_order ) );
        exit;

        // if give wp
    } else if(isset($gwp_donationId)){

        // redirect to final page with REST payment state
        give_send_to_success_page();
        exit;

    } else if(isset($tatiosa_booking_id)){



    }

    // get language
    $language = ( isset($_REQUEST["language"]) ) ? $_REQUEST["language"] : null;

    // get order payment state from REST response
    $paymentState = "DEPOSITED";

    // redirect to final page with REST payment state
    wp_redirect( arca_pg_checkOutPagePermalink($language) . "?state=$paymentState&orderId=$orderId");
    exit;

}

function apg_wc_api_idram_fail(){

    global $wpdb;
    $request = $_REQUEST;

    $orderNumber = $orderId = ( !empty($request["EDP_BILL_NO"]) ) ? intval($request["EDP_BILL_NO"]) : -1;
    $wc_orderId		= 	( !empty($request["wc_orderId"]) ) ? intval($request["wc_orderId"]) : null;
    $gwp_donationId	= 	( !empty($request["gwp_donationId"]) ) ? intval($request["gwp_donationId"]) : null;

    // get previous stored requests
    $OrderStatusExtended = json_decode(
        $wpdb->get_var(
            $wpdb->prepare(
                "SELECT OrderStatusExtended FROM {$wpdb->prefix}arca_pg_orders WHERE orderNumber = %s",
                $orderId
            )
        ),
        true
    );

    // add new request
    $OrderStatusExtended = ( !empty($OrderStatusExtended) ) ? array_merge($OrderStatusExtended, array( "Request - fail" => $_REQUEST ) ) : array( "Request - fail" => $_REQUEST ) ;

    $OrderStatusExtended = json_encode( $OrderStatusExtended );

    // update error number from REST system
    $wpdb->query($wpdb->prepare(
        "UPDATE {$wpdb->prefix}arca_pg_orders 
        SET OrderStatusExtended = %s, paymentState = %s 
        WHERE orderNumber = %d",
        $OrderStatusExtended,
        'fail',
        $orderNumber
    ));


    arca_pg_errorCatch("Idram: " . "fail", $wc_orderId, $gwp_donationId);

}


// APG Idram - start payment
if ($arca_process == "idram"){

    // data validation
    $errMgs = array();

    // get form data or defaults values
    $wc_orderId		= 	( !empty($_REQUEST["wc_orderId"]) ) ? intval($_REQUEST["wc_orderId"]) : null;
    $gwp_donationId	= 	( !empty($_REQUEST["gwp_donationId"]) ) ? intval($_REQUEST["gwp_donationId"]) : null;
    $productId		=	( !empty($_REQUEST["productId"]) ) ? intval($_REQUEST["productId"]) : 0;
    $amount			=	( !empty($_REQUEST["amount"]) ) ? doubleval($_REQUEST["amount"]) : 0;
    $description	=	( !empty($_REQUEST["description"]) ) ? sanitize_text_field($_REQUEST["description"]) : __( "Online payment", 'arca-payment-gateway' );
    $language		=	( !empty($_REQUEST["language"]) ) ? sanitize_text_field($_REQUEST["language"]) : $arca_idram_config->default_language;
    $currency		=	( !empty($_REQUEST["currency"]) ) ? sanitize_text_field($_REQUEST["currency"]) : "051";
    $custom_amount	= ( !empty($_REQUEST["custom_amount"]) && intval($_REQUEST["custom_amount"]) == 1 ) ? 1 : 0;

    // get payment initiator, woocommerce, givewp or apg
    if(isset($wc_orderId)) {

        // get wc order
        $apg_wc_order = wc_get_order($wc_orderId);

        // get order total amount
        $amount = $apg_wc_order->get_total();

        // validate currency
        $currency = ($apg_wc_order->get_currency()) == "AMD" ? "051" : null;
        if ( $currency != "051") array_push($errMgs, "Incorect currency:" . $currency);

    } else if (isset($gwp_donationId)) {

        // get give wp donation amount
        $amount = give_donation_amount($gwp_donationId);

        // get give wp donation currency abbr
        $apg_givewp_currency = (give_get_payment_currency_code($gwp_donationId)) == "AMD" ? "051" : null;

        // validate currency
        if ( $apg_givewp_currency != "051") array_push($errMgs, "Incorect currency:" . $apg_givewp_currency);

    } else {

        if($custom_amount == 0){

            // validate productId
            $resultCount = $wpdb->get_var(
                $wpdb->prepare(
                    "SELECT COUNT(*) FROM {$wpdb->prefix}arca_pg_pricelist WHERE productId = %d",
                    $productId
                )
            );

            if ($resultCount == 0) array_push($errMgs, "incorrect productId:" . $productId);

            // get product details
            $priceList = $wpdb->get_row(
                $wpdb->prepare(
                    "SELECT * FROM {$wpdb->prefix}arca_pg_pricelist WHERE productId = %d",
                    $productId
                )
            );

            // get price, validate price
            $amount = arca_pg_getPriceFromJson($priceList->productPrice, $currency);
            if ($amount == 0) array_push($errMgs, "Incorrect amount:" . $amount . " with the currency:" . $currency);

        }

        // validate currency
        if ( $currency != "051") array_push($errMgs, "Incorect currency:" . $currency);

    }

    // validate language
    $resultCount = $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(*) FROM {$wpdb->prefix}arca_pg_language WHERE code = %s",
        $language
    ));

    if ($resultCount == 0) $language = $arca_idram_config->default_language;

    // validate checkout form permalink
    if (arca_pg_checkOutPagePermalink() == false) array_push($errMgs, "Checkout form not found");

    // get orderDetails
    $orderDetails = json_encode($_REQUEST, JSON_UNESCAPED_UNICODE);

    // validation
    if (empty($errMgs)){

        // create order blank row in db
        $table = $wpdb->prefix . 'arca_pg_orders';
        $data = array(
            'productId'     => $productId,
            'wc_orderId'    => $wc_orderId,
            //'gwp_donationId'    	=> $gwp_donationId,
            'amount'        => $amount,
            'currency'      => $currency,
            'orderDetails'  => $orderDetails,
            'rest_serverID' => ($arca_idram_config->testMode) ? 2 : 1,
            'orderDate'     => current_time('mysql'),
            'bankId'        => 12, // iDram
        );
        $format = array(
            '%d',
            '%d',
            //'%d',
            '%f',
            '%s',
            '%s',
            '%d',
            '%s',
            '%d',
        );
        $insert = $wpdb->insert($table, $data, $format);
        if ($insert){

            // get orderNumber from created row
            $orderNumber  = $wpdb->insert_id;

            // create idram submit form
            ?>
            <form id='apg_idram_form' action='https://banking.idram.am/Payment/GetPayment' method='POST'>
                <input type='hidden' name='EDP_LANGUAGE' value='EN'>
                <input type='hidden' name='EDP_REC_ACCOUNT' value='<?php echo esc_attr(EDP_REC_ACCOUNT); ?>'>
                <input type='hidden' name='EDP_DESCRIPTION' value='<?php echo esc_attr($description); ?>'>
                <input type='hidden' name='EDP_AMOUNT' value='<?php echo esc_attr($amount); ?>'>
                <input type='hidden' name='EDP_BILL_NO' value ='<?php echo esc_attr($orderNumber); ?>'>
                <input type='hidden' name='wc_orderId' value ='<?php echo esc_attr($wc_orderId); ?>'>
                <input type='hidden' name='gwp_donationId' value ='<?php echo esc_attr($gwp_donationId); ?>'>
                <input type='hidden' name='language' value ='<?php echo esc_attr($language); ?>'>
            </form>
            <script>
                document.getElementById('apg_idram_form').submit();
            </script>";
            <?php
            die;

        } else {
            arca_pg_errorCatch("Error on insert new order row, wpdb error: " . $wpdb->error, $wc_orderId, $gwp_donationId);
        }

    } else {
        arca_pg_errorCatch("Data validation error: " . implode(', ', $errMgs), $wc_orderId, $gwp_donationId);
    }

}