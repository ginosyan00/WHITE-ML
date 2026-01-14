<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class apg_rest {

	public function __construct(){

		add_action("wp_ajax_check_rest", array($this, "check_rest_ajax"));
		add_action( 'admin_notices', array($this,'show_api_message') );

		$apg_options = get_option('apg_options');

		if( $apg_options ) {
			
			$last_update = $apg_options['date'];
			$interval = 3600; // 3600 = 1 hour
			$next_run_time = intval( $last_update + $interval );
			$now_time = current_time('timestamp', 1);
			$days_left = (isset($apg_options['days_left'])) ? $apg_options['days_left'] : "-";

			if( $next_run_time <= $now_time && !empty($apg_options) && $apg_options['activation_key'] != '') {
				$activation_key = !empty($apg_options['activation_key']) ? $apg_options['activation_key'] : '';
				$this->check_rest($activation_key);
			}
			
		}

		add_action('apg_activate_form', array($this,'apg_activate_form'));

	}

	public function check_rest_ajax(){

		$apg_nonce = isset($_POST['check_rest_nonce']) ? esc_html($_POST['check_rest_nonce']) : '';

		if ( ! wp_verify_nonce( $apg_nonce, 'check_rest' ) ) {
			return false;
		}

		$key = isset($_POST['apg_activation_key']) ? esc_html($_POST['apg_activation_key']) : '';
		$this->check_rest( $key );

	}

	public function apg_activate_form() {

		$apg_options = get_option('apg_options');
		$activation_key = !empty($apg_options['activation_key']) ? $apg_options['activation_key'] : '';
		$status = !empty($apg_options['status']) ? $apg_options['status'] : '';
		?>

		<div class="apg_activation_container">

			<?php if(intval($status) !== 1) { ?>

			<legend><?php _e( "License:", 'apg' ) ?></legend>

			<form method="post" id="apg_activation_form">
				<?php wp_nonce_field( 'check_rest', 'check_rest_nonce' ); ?>
				<p class="apg_activation_msg apg_hidden"><?php _e( "Something went wrong", 'apg' ) ?></p>
				<input type="text" value="<?php echo esc_html($activation_key) ?>" name="apg_activation_key" id="apg_activation_key" placeholder="<?php _e( "Activation key", 'apg' ) ?>">
				<button type="submit" class="apg_activate_button submitLink button-primary" id="apg_activate_button">
					<?php _e( "Activate", 'apg' ) ?> <img src="<?php echo esc_url(ARCAPG_URL); ?>/images/loading.gif" class="apg_loader apg_hidden">
				</button>
			</form>

			<?php } else { ?>

			<p class="apg_message apg_active_mesage"><?php _e( "License key is active", 'apg' ) ?>, <span id="days_left"><?php _e( "days left:", 'apg' ) ?> <?php echo (isset($apg_options['days_left'])) ? $apg_options['days_left'] : 0; ?></span></p>
			<input type="text" value="<?php echo esc_html($activation_key) ?>" readonly>

			<?php } ?>

			<div id="apg_activation_msg"></div>

		</div>

	<?php }
	
	public function show_api_message() {
		
		$apg_options = get_option('apg_options');
		$masseges = ( !empty($apg_options['msg']) ) ? $apg_options['msg'] : array() ;

    	if( empty($masseges) ) return;
		
		foreach ( $masseges as $msg ) {

			if( !$msg['msg_status'] || $msg['text'] == '' ) continue;

				 ?>

					<div class="notice notice-<?php echo sanitize_html_class($msg['msg_type']); ?> is-dismissible">
						<p><?php echo $msg['text']; ?></p>
					</div>
			
			<?php } 
	}

	public function get_domain() {
		return parse_url( get_site_url() )['host'];
		//return $_SERVER['SERVER_NAME'];
	}

	/*
	public function clear_rest_key() {
		$options = get_option('apg_options');
		$data = array(
			'status' => 0,
			'token' => '',
			'activation_key' => '',
			'msg' => $options['msg'],
			'date' => current_time('timestamp', 1)
		);
		update_option('apg_options', $data);
	}
	*/

	public function check_rest( $key = '' ) {

		/*
		if( $key == '' ) {
			$this->clear_rest_key();
			return;
		}
		*/

		$domain = $this->get_domain();
		$args = array(
			'headers' => array(
				'Content-Type' => 'application/json',
			),
		);
		$result = wp_remote_get('https://store.planetstudio.am/wp-json/rest-check/v1/endpoint?domain='.$domain.'&key='.$key.'&version='.ARCAPG_VERSION, $args);

		if ( is_wp_error($result) ){
			// file_put_contents( ARCAPG_DIR . "/error.txt", $result->get_error_message() );
			return;
		}

		if( !isset($result['body']) || empty($result['body']) || is_object($result) ){
			return;
		}
		
		$result = json_decode($result['body'], 1);
		
		//var_dump($result);
		//die;
		

		if( !isset( $result['success'] ) ) {
			return;
		}
		
		if( $result['success'] ) {
			$data = array(
				'status' => $result['success'],
				'token' => $result['token'],
				'activation_key' => $key,
				'msg' => $result['msg'],
				'date' => current_time('timestamp', 1),
				'days_left' => (isset($result['days_left'])) ? $result['days_left'] : 0,
			);
		} else {
			$data = array(
				'status' => $result['success'],
				'token' => '',
				'activation_key' => $key,
				'msg' => $result['msg'],
				'date' => current_time('timestamp', 1),
				'days_left' => (isset($result['days_left'])) ? $result['days_left'] : 0,
			);
		}

		update_option('apg_options', $data);
		/* Case of ajax */
		if( isset($_POST['action']) && $_POST['action'] == 'check_rest') {
			echo json_encode(array('status' => $result['success'], 'activation_key' => $key, 'response_msg' => $result['response_msg']));
			die;
		}
		
	}
}