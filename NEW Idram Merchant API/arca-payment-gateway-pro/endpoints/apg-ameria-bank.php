<?php
if ( ! defined( 'ABSPATH' ) ) exit;

global $wpdb;
$arca_process = (isset($_REQUEST["arca_process"])) ? sanitize_text_field($_REQUEST["arca_process"]) : null;

define( 'APG_IF_TEST_MODE', (($arca_config->rest_serverID == 2) ? "test" : "") );

// ArCa - start payment
if ($arca_process == "register"){

    // data validation
    $errMgs = array();

    // get form data or defaults values
    $wc_orderId   = ( !empty($_REQUEST["wc_orderId"]) ) ? intval($_REQUEST["wc_orderId"]) : null;
    $gwp_donationId	= 	( !empty($_REQUEST["gwp_donationId"]) ) ? intval($_REQUEST["gwp_donationId"]) : null;
    $productId    =	( !empty($_REQUEST["productId"]) ) ? intval($_REQUEST["productId"]) : 0;
    $amount       =	( !empty($_REQUEST["amount"]) ) ? doubleval($_REQUEST["amount"]) : 0;
    $description  =	wp_parse_url( get_site_url() )['host']; //( !empty($_REQUEST["description"]) ) ? sanitize_text_field($_REQUEST["description"]) : __( "Online payment", 'arca-payment-gateway' );
    $language     =	( !empty($_REQUEST["language"]) ) ? sanitize_text_field($_REQUEST["language"]) : $arca_config->default_language;
    $currency     =	( !empty($_REQUEST["currency"]) ) ? sanitize_text_field($_REQUEST["currency"]) : $arca_config->default_currency;
    $custom_amount	= ( !empty($_REQUEST["custom_amount"]) && intval($_REQUEST["custom_amount"]) == 1 ) ? 1 : 0;
	
    $tatiosa_booking_id   = ( !empty($_REQUEST["bookid"]) ) ? intval($_REQUEST["bookid"]) : null;
    $tatiosa_booking_Key	= 	( !empty($_REQUEST["key"]) ) ? sanitize_text_field($_REQUEST["key"]) : null;
    $tatiosa_client_id = ( !empty($_POST["tatiosa_client_id"]) ) ? intval($_POST["tatiosa_client_id"]) : null;

    // get payment initiator, woocommerce, givewp or apg
    if(isset($wc_orderId)) {

  		// get wc order
    	$apg_wc_order = wc_get_order($wc_orderId);

		// get order total amount
    	$amount = $apg_wc_order->get_total();

	    // validate currency
        $currency_code = $apg_wc_order->get_currency();
        $currency = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT code FROM {$wpdb->prefix}arca_pg_currency WHERE (abbr = %s OR code = %s) AND active = 1",
                $currency_code,
                $currency_code
            )
        );


        if (!isset($currency)) array_push($errMgs, "Incorect currency:" . $currency);

    } else if (isset($gwp_donationId)) {
		
		// get give wp donation amount
		$amount = give_donation_amount($gwp_donationId);
		
	    // get give wp donation currency abbr
	    $apg_givewp_currency = give_get_payment_currency_code($gwp_donationId);
		
	    // validate currency
        $currency = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT code FROM {$wpdb->prefix}arca_pg_currency WHERE (abbr = %s OR code = %s) AND active = 1",
                $apg_givewp_currency,
                $apg_givewp_currency
            )
        );


        if (!isset($currency)) array_push($errMgs, "Incorect currency:" . $currency);
		
	} else if (isset($tatiosa_booking_id)) {


		// validate currency
        $resultCount = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM {$wpdb->prefix}arca_pg_currency WHERE (abbr = %s OR code = %s) AND active = 1",
                $currency,
                $currency
            )
        );


        if ($resultCount == 0) array_push($errMgs, "Incorect currency:" . $currency);

		
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
        $resultCount = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM {$wpdb->prefix}arca_pg_currency WHERE (abbr = %s OR code = %s) AND active = 1",
                $currency,
                $currency
            )
        );


        if ($resultCount == 0) array_push($errMgs, "Incorect currency:" . $currency);

    }

    // validate language
    $resultCount = $wpdb->get_var(
        $wpdb->prepare(
            "SELECT COUNT(*) FROM {$wpdb->prefix}arca_pg_language WHERE code = %s",
            $language
        )
    );

    if ($resultCount == 0) $language = $arca_config->default_language;

    // validate checkout form permalink
    if (arca_pg_checkOutPagePermalink() == false) array_push($errMgs, "Checkout form not found");

    // get pageView
    $ua			= strtolower($_SERVER['HTTP_USER_AGENT']);
    $isMob		= is_numeric(strpos($ua, "mobile"));
    $pageView	= ($isMob) ? "MOBILE" : "DESKTOP";

    // get orderDetails
    $orderDetails = json_encode($_REQUEST, JSON_UNESCAPED_UNICODE);

    // validation
    if (empty($errMgs)){

		// create order blank row in db
		$table = $wpdb->prefix . 'arca_pg_orders';
		$data = array(
			'productId'		=> $productId,
			'wc_orderId'    => $wc_orderId,
			//'gwp_donationId'    	=> $gwp_donationId,
			'amount'		=> $amount,
			'currency'		=> $currency,
			'orderDetails'	=> $orderDetails,
			'rest_serverID'	=> $arca_config->rest_serverID,
			'orderDate'		=> current_time('mysql') ,
            'bankId'        => $arca_config->bankId,
		);
		// generate orderNumber if test server
		if ($arca_config->rest_serverID == 2) $data['orderNumber'] = wp_rand($arca_config->ameriabankMinTestOrderId, $arca_config->ameriabankMaxTestOrderId);
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

			// AmeriaBank - order registration request
			$requestUrl = "https://services". APG_IF_TEST_MODE .".ameriabank.am/VPOS/api/VPOS/InitPayment";
			$args = array(
				'headers'	=> array('Content-Type: text/html; charset=UTF-8'),
				'body'		=> array(
					'ClientID'		=> $arca_config->ameriabankClientID,
					'Username'		=> $apg_vpos_accuonts[$currency]["api_userName"],
					'Password'		=> $apg_vpos_accuonts[$currency]["api_password"],
					'OrderID'		=> ($arca_config->orderNumberPrefix != "") ? $arca_config->orderNumberPrefix . '-' . $orderNumber : $orderNumber,
					'Amount'		=> $amount,
					'Currency'		=> $currency,
					'BackURL'		=> get_site_url() . "?arca_process=payment_completed&wc_orderId=$wc_orderId&gwp_donationId=$gwp_donationId&language=$language&currency=$currency&tatiosa_booking_id=$tatiosa_booking_id&tatiosa_client_id=$tatiosa_client_id",
					'Description'	=> $description,
                    'lang'          => ($language === 'hy') ? 'am' : $language,

                    // Subscriptions
                    //'CardHolderID'	=> wp_get_current_user()->ID,

				),
				'method'		=> 'POST',
				'data_format'	=> 'body',
			);
			$response = wp_remote_post( $requestUrl, $args );

			if( is_object($response) ){
				arca_pg_errorCatch("REST respons error: " . json_encode($response, JSON_UNESCAPED_UNICODE), $wc_orderId, $gwp_donationId);
			} else {
				$response = json_decode($response['body']);
			}

            // check AmeriaBank response to JSON format and ResponseCode
            if (is_object($response) && isset($response->ResponseCode)) {

            	$OrderStatusExtended = json_encode( array( "Response 1" => $response ) );

				if ($response->ResponseCode == 1) {

					// update order row from REST response
                    $wpdb->query( $wpdb->prepare(
                        "UPDATE {$wpdb->prefix}arca_pg_orders SET OrderStatusExtended = %s, errorCode = %s, paymentState = %s, orderId = %s WHERE orderNumber = %d",
                        $OrderStatusExtended,
                        '1', // ErrorCode
                        'Registered', // PaymentState
                        strval($response->PaymentID), // Преобразуем в строку
                        $orderNumber
                    ));

					// redirect to bank page
					wp_redirect("https://services". APG_IF_TEST_MODE .".ameriabank.am/VPOS/Payments/Pay?id=$response->PaymentID&lang=$language");
					exit;

				} else {

					// update error number from REST system					
                    $wpdb->query( $wpdb->prepare(
                        "UPDATE {$wpdb->prefix}arca_pg_orders 
                        SET OrderStatusExtended = %s, errorCode = %s, paymentState = %s 
                        WHERE orderNumber = %d",
                        $OrderStatusExtended,
                        $response->ResponseCode,
                        'Registration failed',
                        $orderNumber
                    ));


                    arca_pg_errorCatch("REST respons error, errorCode: " . $response->ResponseCode, $wc_orderId, $gwp_donationId);
				}

	        } else {
				// REST response is not JSON data
				arca_pg_errorCatch("REST response is not JSON data, response: " . sanitize_text_field($response), $wc_orderId, $gwp_donationId);
	        }

		} else {
			arca_pg_errorCatch("Error on insert new order row, wpdb error: " . $wpdb->last_error, $wc_orderId, $gwp_donationId);
		}

    } else {
		arca_pg_errorCatch("Data validation error: " . implode(', ', $errMgs), $wc_orderId, $gwp_donationId);
    }

}

// REST - payment completed and returned back
if ($arca_process == 'payment_completed' && isset($_REQUEST['orderID']) && isset($_REQUEST['resposneCode']) && isset($_REQUEST['paymentID']) && isset($_REQUEST['currency'])) {

	$orderID		= intval($_REQUEST['orderID']);						// 105
	$paymentID		= sanitize_text_field($_REQUEST['paymentID']);		// 15C8E0DE-F082-4785-883E-A5FADB093BE2	
	$resposneCode	= sanitize_text_field($_REQUEST['resposneCode']);
	$currency		= sanitize_text_field($_REQUEST['currency']);
	$wc_orderId 	= ( !empty($_REQUEST["wc_orderId"]) ) ? intval($_REQUEST["wc_orderId"]) : null;
	$gwp_donationId	= ( !empty($_REQUEST["gwp_donationId"]) ) ? intval($_REQUEST["gwp_donationId"]) : null;
	
   	$tatiosa_booking_id   = ( !empty($_REQUEST["tatiosa_booking_id"]) ) ? intval($_REQUEST["tatiosa_booking_id"]) : null;
	

	if ( $resposneCode == "00" ) {

		// create order status request from REST / Extended
		$requestUrl = "https://services". APG_IF_TEST_MODE .".ameriabank.am/VPOS/api/VPOS/GetPaymentDetails";
		$args = array(
			'headers'		=> array('Content-Type: text/html; charset=UTF-8'),
			'body'			=> array(
				'Username'		=> $apg_vpos_accuonts[$currency]["api_userName"],
				'Password'		=> $apg_vpos_accuonts[$currency]["api_password"],
				'paymentID'		=> $paymentID,
			),
			'method'		=> 'POST',
			'data_format'	=> 'body',
		);
		$response = wp_remote_post( $requestUrl, $args );

		if( is_object($response) ){
			arca_pg_errorCatch("REST respons error: " . json_encode($response, JSON_UNESCAPED_UNICODE), $wc_orderId, $gwp_donationId);
		} else {
			$response = $response['body'];
		}

		// get previous stored requests
        $OrderStatusExtended = json_decode(
            $wpdb->get_var(
                $wpdb->prepare(
                    "SELECT OrderStatusExtended FROM {$wpdb->prefix}arca_pg_orders WHERE orderNumber = %d",
                    $orderID
                )
            ),
            true
        );

        // add new request
		$OrderStatusExtended = array_merge($OrderStatusExtended, array( "Response 2" => json_decode($response, true) ) );
		
		$OrderStatusExtended = json_encode( $OrderStatusExtended );

		$response = json_decode($response);

        // check REST response to JSON format
        if (is_object($response) && isset($response->ResponseCode) && $response->ResponseCode == "00") {

			// update order row from REST response
            $wpdb->query( $wpdb->prepare(
                "UPDATE {$wpdb->prefix}arca_pg_orders 
                SET OrderStatusExtended = %s, paymentState = %s 
                WHERE orderNumber = %d",
                $OrderStatusExtended,
                'Successful',
                $orderID
            ));


			// if woocommerce
		    if(isset($wc_orderId)) {

				// get wc order
				$apg_wc_order = wc_get_order($wc_orderId);

				// set wc order status 
				$apg_wc_order->set_status($arca_config->wc_order_status, 'wc_apg_gatewey');


                // eHDM print for woocommerce orders
                if( has_action('eHDM-print') ) {

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
                            'orderId' => $paymentID,
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


				$apg_wc_order->save();
		        
		        $apg_wc_order->reduce_order_stock();
		        WC()->cart->empty_cart(); 
				
				// set email sent if email exist in wc order
                $wpdb->query( $wpdb->prepare(
                    "UPDATE {$wpdb->prefix}arca_pg_orders 
                    SET mailSent = %d 
                    WHERE orderNumber = %d",
                    1,  // Значение для mailSent
                    $orderID  // Значение для orderNumber
                ));


                // get wc return url
				$wc_apg_gatewey = new wc_apg_gatewey();

				// redirect to final page with REST payment state
				wp_redirect( $wc_apg_gatewey->get_return_url( $apg_wc_order ) );
				exit;

		    	// if give wp
		    } else if(isset($gwp_donationId)){	

				// set give wp donate status 
				give_update_payment_status( $gwp_donationId, "publish" );

				// set email sent if email exist in wc order
                $wpdb->query( $wpdb->prepare(
                    "UPDATE {$wpdb->prefix}arca_pg_orders 
                    SET mailSent = %d 
                    WHERE orderNumber = %d",
                    1,
                    $orderID
                ));


                // redirect to final page with REST payment state
				give_send_to_success_page();
				exit;
				
			// if tatiosa booking
		    } else if(isset($tatiosa_booking_id)){
				

				// get ws order status processing or failed
				$apg_booking_orderStatus = ( $paymentState == 'DEPOSITED' ) ? 1 : 0; //booking status, 0 (cancelled), 1 (confirmed), 2 (new), 3 (request)
				$code = 0;
				
				if( $apg_booking_orderStatus == 1){
					
					$tatiosa_booking_Key = wp_parse_url( get_site_url() )['host'];
					$description = 'Paid via Credit Card';
					$payment_status = 'Successful';
					$amount = $response->ApprovedAmount;

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
                            "SELECT OrderStatusExtended FROM {$wpdb->prefix}arca_pg_orders WHERE orderNumber = %s",
                            $orderID
                        )
                    ),
                    true
                );

				// add new request
				$OrderStatusExtended = array_merge($OrderStatusExtended, array( "Booking System Response 1" => json_decode('{"Status": '.$code.'}', true) ) );

				$OrderStatusExtended = json_encode( $OrderStatusExtended );
				
				// update order row from REST response
                $wpdb->query( $wpdb->prepare(
                    "UPDATE {$wpdb->prefix}arca_pg_orders 
                    SET OrderStatusExtended = %s, paymentState = %s 
                    WHERE orderNumber = %d",
                    $OrderStatusExtended,
                    'Successful',
                    $orderID
                ));


            }
	    
	    // eHDM print for apg orders
            if( has_action('eHDM-print') && !isset($gwp_donationId) ) {

                $amount = $response->ApprovedAmount;

                $cardAmount = $amount;      // Անկանխիկ վճարված գումար (double)
                $cashAmount = 0;            // Առձեռն /կանխիկ/ վճարված գումար (double)
                $partialAmount = 0;         // Մասնակի վճարման գումար (double)
                $prePaymentAmount = 0;      // Կանխավճարի օգտագործման գումար (double)
                $cashierId = 1;             // Գանձապահի համարը (int)
                $mode = 3;                  // Կտրոնի տպման ռեժիմ: 2 – Ապրանքներ ռեժիմ 3 – Կանխավճար (int)
                $partnerTin = null;         // Գնորդի ՀՎՀՀ (string)

                do_action('eHDM-print',
                    [
                        'orderId' => $paymentID,
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
            // end eHDM print

		    // get language
		    $language = ( isset($_REQUEST["language"]) ) ? $_REQUEST["language"] : null;		    

			// finish redirection with payment state
			wp_redirect( arca_pg_checkOutPagePermalink($language) . "?state=DEPOSITED&orderId=$paymentID");
			exit;	

		} else {

			// REST response is not JSON data
			arca_pg_errorCatch("REST response is not JSON data, response: " . sanitize_text_field($response), $wc_orderId, $gwp_donationId);
		}

	} else {

		// get previous stored requests
        $OrderStatusExtended = json_decode(
            $wpdb->get_var(
                $wpdb->prepare(
                    "SELECT OrderStatusExtended FROM {$wpdb->prefix}arca_pg_orders WHERE orderNumber = %s",
                    $orderID
                )
            ),
            true
        );

		// add new request
		$OrderStatusExtended = array_merge($OrderStatusExtended, array( "Response 2" => json_decode( json_encode($_REQUEST, JSON_UNESCAPED_UNICODE) , true) ) );
		
		$OrderStatusExtended = json_encode( $OrderStatusExtended );

		// update order payment response error data
        $wpdb->query( $wpdb->prepare(
            "UPDATE {$wpdb->prefix}arca_pg_orders 
            SET OrderStatusExtended = %s, paymentState = %s, errorCode = %s 
            WHERE orderNumber = %d",
            $OrderStatusExtended,
            'Failed',
            $resposneCode,
            $orderID
        ));

        // if woocommerce
		if(isset($wc_orderId)) {
			// get wc order
			$apg_wc_order = wc_get_order($wc_orderId);
			// set wc order status 
			$apg_wc_order->set_status('failed', 'wc_apg_gatewey');
		}		

		arca_pg_errorCatch("REST respons error, errorCode: " . sanitize_text_field($resposneCode), $wc_orderId, $gwp_donationId);
	}

}
