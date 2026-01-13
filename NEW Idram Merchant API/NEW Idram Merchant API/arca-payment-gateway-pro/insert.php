<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class arcapgInsert {

  public static function arca_pg_tables() {
    global $wpdb;

    //$wpdb->show_errors();

    /*--
    -- Table structure for table `wp_arca_pg_banks`
    --*/
    $wpdb->query("CREATE TABLE IF NOT EXISTS `" . $wpdb->prefix . "arca_pg_banks` (
        `bankId` int(11) NOT NULL AUTO_INCREMENT,
        `bankName` varchar(50) NOT NULL,
        PRIMARY KEY (`bankId`)
    ) " . $wpdb->get_charset_collate() . ";");


    /*--
    -- Dumping data for table `wp_arca_pg_banks`
    --
    */
    $exists_default = $wpdb->get_var("SELECT count(bankId) FROM " . $wpdb->prefix . "arca_pg_banks");
    if ( !$exists_default ) {
        $wpdb->query("INSERT INTO `" . $wpdb->prefix . "arca_pg_banks` (`bankId`, `bankName`) VALUES
      (1, 'ACBA Bank'),
      (2, 'Ardshin Bank'),
      (3, 'Evoca Bank'),
      (4, 'Ineco Bank'),
      (5, 'Armswiss Bank'),
      (6, 'Byblos Bank Armenia'),
      (7, 'Ararat Bank'),
      (8, 'Armeconombank'),
      (9, 'IDBank'),
      (10, 'Ameria Bank'),
      (11, 'Convers Bank')
      ");
    }

    /*--
    -- Table structure for table `wp_arca_pg_config`
    --*/
    $wpdb->query("CREATE TABLE IF NOT EXISTS `" . $wpdb->prefix . "arca_pg_config` (
      `rest_serverID` int(11) NOT NULL,
      `bankId` int(11) NOT NULL,
      `rest_serverName` varchar(50) NOT NULL,
      `vpos_accuonts` longtext NOT NULL,
      `default_language` varchar(2) NOT NULL,
      `default_currency` varchar(3) NOT NULL,
      `orderNumberPrefix` varchar(20) NOT NULL,
      `startOrderNumber` int(11) NOT NULL,
      `checkoutFormPage` varchar(255) NOT NULL,
      `privacyPolicyPage` varchar(255) NOT NULL,
      `checkoutFormElements` longtext NOT NULL,
      `mailFrom` varchar(50) NOT NULL,
      `adminLastVisitDate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      `active` tinyint(1) NOT NULL,
      `ameriabankClientID` varchar(50) NOT NULL,
      `ameriabankMinTestOrderId` int(11) NOT NULL,
      `ameriabankMaxTestOrderId` int(11) NOT NULL,
      `arca_test_api_port` int(11) NOT NULL,
      `wc_order_status` varchar(10) NOT NULL,
     PRIMARY KEY (`rest_serverID`)
    ) " . $wpdb->get_charset_collate() . ";");

    /*--
    -- Dumping data for table `wp_arca_pg_config`
    --
    */
      $table = $wpdb->prefix . 'arca_pg_config';
      $data_real = array(
        'rest_serverID'                   => 1,
        'rest_serverName'                 => 'Real server',
        'default_language'                => 'hy',
        'default_currency'                => '051',
        'startOrderNumber'                => 1,
        'checkoutFormPage'                => 'apg-checkout',
        'privacyPolicyPage'            => 'agp-privacy-and-policy',
        'checkoutFormElements'            => '{
                        "fullName"    : { "label":"Full name:", "enabled":true, "required":true, "type":"text" },
                        "phoneNumber" : { "label":"Phone number:", "enabled":true, "required":true, "type":"text" },
                        "email"       : { "label":"Email", "enabled":true, "required":false, "type":"email" },
                        "country"     : { "label":"Country:", "enabled":true, "required":false, "type":"text" },
                        "city"        : { "label":"City:", "enabled":true, "required":false, "type":"text" },
                        "address"     : { "label":"Address:", "enabled":true, "required":false, "type":"text" },
                        "zipcode"     : { "label":"Zip Code:", "enabled":true, "required":false, "type":"text" },
                        "comments"    : { "label":"Comments:", "enabled":true, "required":false, "type":"textarea" }
                      }',
        'adminLastVisitDate'              => '2022-01-01 00:00:00',
        'active'                          => 0,
        'vpos_accuonts'                   => '{"051":{"api_userName":"","api_password":""},"643":{"api_userName":"","api_password":""},"840":{"api_userName":"","api_password":""},"978":{"api_userName":"","api_password":""}}',
        'arca_test_api_port'              => 0,
        'wc_order_status'             	  => 'processing',
      );
      $data_test = array(
        'rest_serverID'                   => 2,
        'rest_serverName'                 => 'Test server',
        'default_language'                => 'hy',
        'default_currency'                => '051',
        'startOrderNumber'                => 1,
        'checkoutFormPage'                => 'apg-checkout',
        'privacyPolicyPage'            => 'apg-privacy-policy',
        'checkoutFormElements'            => '{
                        "fullName"    : { "label":"Full name:", "enabled":true, "required":true, "type":"text" },
                        "phoneNumber" : { "label":"Phone number:", "enabled":true, "required":true, "type":"text" },
                        "email"       : { "label":"Email", "enabled":true, "required":false, "type":"email" },
                        "country"     : { "label":"Country:", "enabled":true, "required":false, "type":"text" },
                        "city"        : { "label":"City:", "enabled":true, "required":false, "type":"text" },
                        "address"     : { "label":"Address:", "enabled":true, "required":false, "type":"text" },
                        "zipcode"     : { "label":"Zip Code:", "enabled":true, "required":false, "type":"text" },
                        "comments"    : { "label":"Comments:", "enabled":true, "required":false, "type":"textarea" }
                      }',
        'adminLastVisitDate'              => '2022-01-01 00:00:00',
        'active'                          => 1,
        'vpos_accuonts'                   => '{"051":{"api_userName":"","api_password":""},"643":{"api_userName":"","api_password":""},"840":{"api_userName":"","api_password":""},"978":{"api_userName":"","api_password":""}}',
        'arca_test_api_port'              => 8444,
        'wc_order_status'             	  => 'processing',
     );
    $format = array( '%d','%s','%s','%s','%d','%s','%s','%s', '%s', '%d', '%s', '%d', '%s' );

    $exists_default = $wpdb->get_var("SELECT count(rest_serverID) FROM $table");

    if ( !$exists_default ) {

      $wpdb->insert( $table, $data_real, $format );
      $wpdb->insert( $table, $data_test, $format );

    } elseif (intval($exists_default) == 1) {

      // delete autoincrement, for 1.0.1 version
      $wpdb->query("ALTER TABLE $table CHANGE `rest_serverID` `rest_serverID` INT(11) NOT NULL;");

      // update rest_serverID to 2, test version is 2
            $wpdb->query( $wpdb->prepare("UPDATE {$table} SET rest_serverID = %d", 2 ));

      // get current bank id
      $arca_pg_test_bankId = $wpdb->get_var("SELECT bankId FROM " . $wpdb->prefix . "arca_pg_config");

      // insert real server config
      $wpdb->insert( $table, $data_real, $format );

      // update reat server bank id from test server bank id
      $wpdb->query( $wpdb->prepare("update $table set bankId = %d", $arca_pg_test_bankId ));

    }


    //-- --------------------------------------------------------

    /*--
    -- Table structure for table `wp_arca_pg_currency`
    --
    */

    $wpdb->query("CREATE TABLE IF NOT EXISTS `".$wpdb->prefix."arca_pg_currency` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `code` varchar(3) NOT NULL,
      `abbr` varchar(20) NOT NULL,
      `name` varchar(50) NOT NULL,
      `active` tinyint(1) NOT NULL,
      PRIMARY KEY (`id`),
      UNIQUE KEY `code` (`code`),
      UNIQUE KEY `abbr` (`abbr`)
    ) " . $wpdb->get_charset_collate() . ";");

    /*--
    -- Dumping data for table `wp_arca_pg_currency`
    --
    */

    $exists_default = $wpdb->get_var('SELECT count(id) FROM ' . $wpdb->prefix . "arca_pg_currency");
    if ( !$exists_default ) {
      $wpdb->query("INSERT INTO `" . $wpdb->prefix . "arca_pg_currency` (`code`, `abbr`, `name`, `active`) VALUES
        ('051', 'AMD', 'Armenian Dram', 1),
        ('643', 'RUB', 'Russian Ruble', 0),
        ('840', 'USD', 'US Dollar', 0),
        ('978', 'EUR', 'Euro', 0);");
    }

    //-- --------------------------------------------------------

    /*--
    -- Table structure for table `wp_arca_pg_errorlogs`
    --
    */

    $wpdb->query("CREATE TABLE IF NOT EXISTS `".$wpdb->prefix."arca_pg_errorlogs` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `dateTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      `error` varchar(1000) NOT NULL,
      `rest_serverID` int(11) NOT NULL,
      PRIMARY KEY (`id`)
    ) " . $wpdb->get_charset_collate() . ";");

    //-- --------------------------------------------------------

    /*--
    -- Table structure for table `wp_arca_pg_language`
    --
    */

    $wpdb->query("CREATE TABLE IF NOT EXISTS `".$wpdb->prefix."arca_pg_language` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `code` varchar(5) NOT NULL,
      `language` varchar(50) NOT NULL,
      PRIMARY KEY (`id`),
      UNIQUE KEY `language` (`language`),
      UNIQUE KEY `code` (`code`)
    ) " . $wpdb->get_charset_collate() . ";");

    /*--
    -- Dumping data for table `wp_arca_pg_language`
    --
    */
    $exists_default = $wpdb->get_var('SELECT count(id) FROM ' . $wpdb->prefix . "arca_pg_language");
    if ( !$exists_default ) {
      $wpdb->query("INSERT INTO `" . $wpdb->prefix . "arca_pg_language` (`code`, `language`) VALUES
        ('hy', 'Armenian'),
        ('en', 'English'),
        ('ru', 'Russian');");
    }


    //-- --------------------------------------------------------

    /*--
    -- Table structure for table `wp_arca_pg_idram_language`
    --
    */

    $wpdb->query("CREATE TABLE IF NOT EXISTS `".$wpdb->prefix."arca_pg_idram_language` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `code` varchar(5) NOT NULL,
      `language` varchar(50) NOT NULL,
      PRIMARY KEY (`id`),
      UNIQUE KEY `language` (`language`),
      UNIQUE KEY `code` (`code`)
    ) " . $wpdb->get_charset_collate() . ";");

    /*--
    -- Dumping data for table `wp_arca_pg_idram_language`
    --
    */
    $exists_default = $wpdb->get_var('SELECT count(id) FROM ' . $wpdb->prefix . "arca_pg_idram_language");
    if ( !$exists_default ) {
      $wpdb->query("INSERT INTO `" . $wpdb->prefix . "arca_pg_idram_language` (`code`, `language`) VALUES
        ('hy', 'Armenian'),
        ('en', 'English'),
        ('ru', 'Russian');");
    }


    //-- --------------------------------------------------------

    /*--
    -- Table structure for table `wp_arca_pg_orders`
    --
    */

    $wpdb->query("CREATE TABLE IF NOT EXISTS `".$wpdb->prefix."arca_pg_orders` (
      `orderNumber` int(11) NOT NULL AUTO_INCREMENT,
      `orderId` varchar(100) DEFAULT NULL,
      `productId` int(11) DEFAULT NULL,
      `wc_orderId` int(11) DEFAULT NULL,
      `amount` double DEFAULT NULL,
      `currency` varchar(3) DEFAULT NULL,
      `errorCode` varchar(10) DEFAULT NULL,
      `paymentState` varchar(20) DEFAULT NULL,
      `OrderStatusExtended` longtext DEFAULT NULL,
      `orderDetails` longtext DEFAULT NULL,
      `orderDate` timestamp NOT NULL DEFAULT current_timestamp(),
      `mailSent` tinyint(1) NOT NULL,
      `rest_serverID` int(11) NOT NULL,
      `bankId` int(11) DEFAULT NULL,
      PRIMARY KEY (`orderNumber`)
    ) " . $wpdb->get_charset_collate() . ";");

    //-- --------------------------------------------------------

    /*--
    -- Table structure for table `wp_arca_pg_pricelist`
    --
    */

    $wpdb->query("CREATE TABLE IF NOT EXISTS `".$wpdb->prefix."arca_pg_pricelist` (
      `productId` int(11) NOT NULL AUTO_INCREMENT,
      `productName` varchar(250) NOT NULL,
      `productDescription` varchar(500) NOT NULL,
      `productPrice` longtext NOT NULL,
      PRIMARY KEY (`productId`)
    ) " . $wpdb->get_charset_collate() . ";");


    //-- --------------------------------------------------------

    /*--
    -- Table structure for table `wp_arca_pg_idram_config`
    --
    */

    $wpdb->query("CREATE TABLE IF NOT EXISTS `".$wpdb->prefix."arca_pg_idram_config` (
	`id` int(11) NOT NULL AUTO_INCREMENT,
	`idramID` VARCHAR(20) NOT NULL , 
	`idramKey` VARCHAR(50) NOT NULL , 
	`idramTestID` VARCHAR(20) NOT NULL , 
	`idramTestKey` VARCHAR(50) NOT NULL , 
	`rocketLine` tinyint(1) NOT NULL,
	`testMode` tinyint(1) NOT NULL,
	`idramEnabled` tinyint(1) NOT NULL,
    `wc_order_status` varchar(10) NOT NULL,
    `default_language` varchar(2) NOT NULL,
	PRIMARY KEY (`id`)
	) " . $wpdb->get_charset_collate() . ";");

	/*--
    -- Dumping data for table `wp_arca_pg_idram_config`
    --
    */
    $exists_default = $wpdb->get_var("SELECT count(id) FROM " . $wpdb->prefix . "arca_pg_idram_config");
    if ( !$exists_default ) {
        $wpdb->query("INSERT INTO `" . $wpdb->prefix . "arca_pg_idram_config` (`idramID`, `idramKey`, `idramTestID`, `idramTestKey`, `rocketLine`, `testMode`, `wc_order_status`, `default_language`) VALUES
      ('', '', '', '', 0, 0, 'processing', 'hy')
      ");
    }


    /*
      create pages
    */

    // create / insert checkout form page
    $row = $wpdb->get_row( "select id from " . $wpdb->prefix . "posts where post_name = 'apg-checkout'", ARRAY_A);
    if ( empty($row) ) {
      $post_params = array(
        'post_author' => 1,
        'post_status' => 'publish',
        'post_content' => '[arca-pg-form]',
        'post_title' => 'Checkout',
        'post_name' => 'apg-checkout',
        'post_type' => 'page',
        'capability_type'     => 'post',
        'comment_status' => 'closed',
        'ping_status' => 'closed',
        'post_parent' => 0,
        'menu_order' => 0,
        'import_id' => 0,
      );
      wp_insert_post($post_params);
    }

    // create / insert "Privacy Policy" Page
    $row = $wpdb->get_row( "select id from " . $wpdb->prefix . "posts where post_name = 'apg-privacy-policy'", ARRAY_A);
    if ( empty($row) ) {
      $post_params = array(
        'post_author' => 1,
        'post_status' => 'publish',
        'post_content' => '',
        'post_title' => 'Privacy Policy',
        'post_name' => 'apg-privacy-policy',
        'post_type' => 'page',
        'capability_type'     => 'post',
        'comment_status' => 'closed',
        'ping_status' => 'closed',
        'post_parent' => 0,
        'menu_order' => 0,
        'import_id' => 0,
      );
      wp_insert_post($post_params);
    }


    // UPDATE 2.2.4

    $result = $wpdb->query( "SHOW COLUMNS FROM `" . $wpdb->prefix . "arca_pg_config` LIKE 'bankId'"  );
    if ( !$result ) {
        $wpdb->query("ALTER TABLE `" . $wpdb->prefix . "arca_pg_config` ADD `bankId` int(11) NOT NULL");
        $wpdb->query("ALTER TABLE `" . $wpdb->prefix . "arca_pg_config` ADD `ameriabankClientID` varchar(50) NOT NULL");
        $wpdb->query("ALTER TABLE `" . $wpdb->prefix . "arca_pg_config` ADD `ameriabankMinTestOrderId` int(11) NOT NULL");
        $wpdb->query("ALTER TABLE `" . $wpdb->prefix . "arca_pg_config` ADD `ameriabankMaxTestOrderId` int(11) NOT NULL");

        $wpdb->query("ALTER TABLE `" . $wpdb->prefix . "arca_pg_orders` ADD `wc_orderId` int(11) DEFAULT NULL");
        $wpdb->query("ALTER TABLE `" . $wpdb->prefix . "arca_pg_orders` CHANGE `orderId` `orderId` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, CHANGE `productId` `productId` INT(11) NULL, CHANGE `amount` `amount` DOUBLE NULL, CHANGE `currency` `currency` VARCHAR(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, CHANGE `paymentState` `paymentState` VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, CHANGE `OrderStatusExtended` `OrderStatusExtended` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, CHANGE `orderDetails` `orderDetails` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, CHANGE `mailSent` `mailSent` TINYINT(1) NULL, CHANGE `rest_serverID` `rest_serverID` INT(11) NULL;");
        $wpdb->query("ALTER TABLE `" . $wpdb->prefix . "arca_pg_config` CHANGE `rest_serverID` `rest_serverID` INT(11) NOT NULL;");
     }


	// UPDATE 2.2.5 - Privacy & Policy Page

    $result = $wpdb->query( "SHOW COLUMNS FROM `" . $wpdb->prefix . "arca_pg_config` LIKE 'privacyPolicyPage'"  );
    if ( !$result ) {
        $wpdb->query("ALTER TABLE `" . $wpdb->prefix . "arca_pg_config` ADD `privacyPolicyPage` varchar(255) NOT NULL");
		$wpdb->query( $wpdb->prepare("update `" . $wpdb->prefix . "arca_pg_config` set privacyPolicyPage = %s", "apg-privacy-policy" ));
	}

	// update 2.2.6 - vpos wc order status
    $result = $wpdb->query( "SHOW COLUMNS FROM `" . $wpdb->prefix . "arca_pg_config` LIKE 'wc_order_status'"  );
    if ( !$result ) {
        $wpdb->query("ALTER TABLE `" . $wpdb->prefix . "arca_pg_config` ADD `wc_order_status` varchar(10) NOT NULL");
		$wpdb->query( $wpdb->prepare("update `" . $wpdb->prefix . "arca_pg_config` set wc_order_status = %s", "processing" ));
	}

	// update 2.2.6 - idram wc order status
    $result = $wpdb->query( "SHOW COLUMNS FROM `" . $wpdb->prefix . "arca_pg_idram_config` LIKE 'wc_order_status'"  );
    if ( !$result ) {
        $wpdb->query("ALTER TABLE `" . $wpdb->prefix . "arca_pg_idram_config` ADD `wc_order_status` varchar(10) NOT NULL");
		$wpdb->query( $wpdb->prepare("update `" . $wpdb->prefix . "arca_pg_idram_config` set wc_order_status = %s", "processing" ));
	}

	// update 2.2.6 - idram default_language
    $result = $wpdb->query( "SHOW COLUMNS FROM `" . $wpdb->prefix . "arca_pg_idram_config` LIKE 'default_language'"  );
    if ( !$result ) {
        $wpdb->query("ALTER TABLE `" . $wpdb->prefix . "arca_pg_idram_config` ADD `default_language` varchar(2) NOT NULL");
		$wpdb->query( $wpdb->prepare("update `" . $wpdb->prefix . "arca_pg_idram_config` set default_language = %s", "hy" ));
	}
     // update vpos_accuonts
    $result = $wpdb->query( "SHOW COLUMNS FROM `" . $wpdb->prefix . "arca_pg_config` LIKE 'vpos_accuonts'"  );
    if ( !$result ) {

        $wpdb->query("ALTER TABLE `" . $wpdb->prefix . "arca_pg_config` ADD `vpos_accuonts` longtext NOT NULL");
        $wpdb->query("ALTER TABLE `" . $wpdb->prefix . "arca_pg_config` ADD `arca_test_api_port` int(11) NOT NULL");

        // update real server
        $arca_config = $wpdb->get_row("select * from " . $wpdb->prefix . "arca_pg_config where rest_serverID = 1");
        $apg_vpos_accuonts = json_decode('{ "051":{ "api_userName":"", "api_password":"" }, "643":{ "api_userName":"", "api_password":"" }, "840":{ "api_userName":"", "api_password":"" }, "978":{ "api_userName":"", "api_password":"" } }', true);
        $apg_vpos_accuonts[$arca_config->default_currency]["api_userName"] = $arca_config->api_userName;
        $apg_vpos_accuonts[$arca_config->default_currency]["api_password"] = $arca_config->api_password;
        $wpdb->query("update `" . $wpdb->prefix . "arca_pg_config` set vpos_accuonts = '".json_encode($apg_vpos_accuonts)."', arca_test_api_port = 0 where rest_serverID = 1");

            // update test server
            $arca_config = $wpdb->get_row("select * from " . $wpdb->prefix . "arca_pg_config where rest_serverID = 2");
            $apg_vpos_accuonts = json_decode('{ "051":{ "api_userName":"", "api_password":"" }, "643":{ "api_userName":"", "api_password":"" }, "840":{ "api_userName":"", "api_password":"" }, "978":{ "api_userName":"", "api_password":"" } }', true);
            $apg_vpos_accuonts[$arca_config->default_currency]["api_userName"] = $arca_config->api_userName;
            $apg_vpos_accuonts[$arca_config->default_currency]["api_password"] = $arca_config->api_password;
            $wpdb->query(
                $wpdb->prepare(
                    "UPDATE {$wpdb->prefix}arca_pg_config SET vpos_accuonts = %s, arca_test_api_port = %d WHERE rest_serverID = %d",
                    json_encode($apg_vpos_accuonts),
                    8444,
                    2
                )
            );

        // delete old columns
        //$wpdb->query("ALTER TABLE `" . $wpdb->prefix . "arca_pg_config` DROP `api_userName`, DROP `api_password`, DROP `rest_RegisterUrl`, DROP `rest_getOrderStatusExtendedUrl`, DROP `arca_adminPageUrl`");

     }

    // update 2.3.8 - remove ON UPDATE CURRENT_TIMESTAMP
      $table_name = $wpdb->prefix . 'arca_pg_orders';
      $column_name = 'orderDate';

      $column = $wpdb->get_row($wpdb->prepare(
          "SHOW COLUMNS FROM `$table_name` LIKE %s",
          $column_name
      ), ARRAY_A);

        if ($column) {
            if (!empty($column['Extra']) && strpos(strtolower($column['Extra']), 'on update current_timestamp') !== false) {
                $result = $wpdb->query(
                    $wpdb->prepare(
                        "ALTER TABLE `$table_name` MODIFY COLUMN `$column_name` TIMESTAMP DEFAULT %s",
                        'CURRENT_TIMESTAMP'
                    ));
            }
        }

      // add field bankId
      $table_name = $wpdb->prefix . 'arca_pg_orders';
      $column_name = 'bankId';
      $column_exists = $wpdb->get_results($wpdb->prepare("
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = %s 
            AND COLUMN_NAME = %s 
            LIMIT 1
        ", $table_name, $column_name));

      if (empty($column_exists)) {
          $wpdb->query("ALTER TABLE $table_name ADD COLUMN $column_name INT(11) NOT NULL;");
      }


      /** subscription changes */

      // add fields orderType
      $table_name = $wpdb->prefix . 'arca_pg_orders';
      $column_name = 'orderType';
      $column_exists = $wpdb->get_results($wpdb->prepare("
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = %s 
            AND COLUMN_NAME = %s 
            LIMIT 1
        ", $table_name, $column_name));

      if (empty($column_exists)) {
          $wpdb->query("ALTER TABLE $table_name ADD COLUMN $column_name INT(11);");
      }

      // add fields bindingId
      $table_name = $wpdb->prefix . 'arca_pg_orders';
      $column_name = 'bindingId';
      $column_exists = $wpdb->get_results($wpdb->prepare("
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = %s 
            AND COLUMN_NAME = %s 
            LIMIT 1
        ", $table_name, $column_name));

      if (empty($column_exists)) {
          $wpdb->query("ALTER TABLE $table_name ADD COLUMN $column_name varchar(50);");
      }


    // insert idram to banks if not exist
      $table_name = $wpdb->prefix . 'arca_pg_banks';
      $existing_bank = $wpdb->get_var($wpdb->prepare(
          "SELECT COUNT(*) FROM $table_name WHERE bankId = %d",
          12
      ));
      if (!$existing_bank) {
          $wpdb->insert(
              $table_name,
              [
                  'bankId' => 12,
                  'bankName' => 'Idram'
              ],
              [
                  '%d',
                  '%s'
              ]
          );
      }

    // END UPDATE

    if ( ARCAPG_PRO ) {
      $apg_options = get_option('apg_options');
      if ( !empty($apg_options) ) {
        $apg_options['msg'] = '';
        update_option('apg_options', $apg_options);
      }
    }

        $table = $wpdb->prefix.'arca_pg_config';
        $wpdb->query($wpdb->prepare("UPDATE {$table} SET active = %d", 0));

        $wpdb->query($wpdb->prepare("UPDATE {$table} SET active = %d WHERE rest_serverID = %d", 1, 1));

      //$wpdb->print_error();

  }

}

