jQuery(document).ready(function(){
	
   jQuery('.arca-pg-thickbox').on("click", function() {
   tb_click.call(this);
      var alink = jQuery(this).parents('.available-theme').find('.activatelink');
      var href = jQuery(this).attr('href');
      var url, text;
      var link = "Title";
      return false;
   });

	// How To Use
	jQuery(document).ready(function(){
		jQuery("#HowToUse h2").click(function(){
			jQuery(this).next("ol").slideToggle("fast");
		});
	});
	
   // if not ameria bank hide ameria fields 
   jQuery("#apg-bank-switcher").change(function(){
      if( jQuery("#apg-bank-switcher").val() == 10 ){
         jQuery(".apg-ameria-fields").show();
      } else {
         jQuery(".apg-ameria-fields").hide();
      }
   });

   // json view
   jQuery(".apg .jsonView").on("click", function() {
      jQuery("#apg-jsonView textarea").html( JSON.stringify( JSON.parse(jQuery(this).find('.jsonData').html()) , undefined, 4) );
      jQuery("#apg-jsonView").show();
   });

   jQuery(".popupClose, .popupCloseButton").on("click", function() {
      jQuery(".apg-popup").hide();
   });

   jQuery(document).keyup(function(e) {
      if (e.key === "Escape") {
         jQuery(".apg-popup").hide();
      }
   });

   jQuery(".apg-how-to-use-button").on("click", function(){
      jQuery(".apg-layout").removeClass("apg-hidden");
   });

   jQuery(".apg-layout:not(.apg-how-to-use-popup), .apg-close").on("click", function(){
      jQuery(".apg-layout").addClass("apg-hidden");
   });

   jQuery(".show-hide").mousedown(function() {
      jQuery(this).prev(".api-password").attr("type", "text");
   });

   jQuery(".show-hide").mouseup(function() {
      jQuery(this).prev(".api-password").attr("type", "password");
   });

   // on deactivate
   jQuery(document).on("click", "#deactivate-arca-payment-gateway, #deactivate-arca-payment-gateway-pro", function () {
      jQuery("#skip-and-deactivate").attr( "href", jQuery(this).attr("href") );
      jQuery("#apg-deactivate-url").val( jQuery(this).attr("href") );
      jQuery("#apg-deactivate-popup").show();
      return false;
   });

   // show / hide other deactivate reason fields
   jQuery(".apg-deactivate-form-body input").on("change", function(){

      // hide and disable all other reason field / textarea
      jQuery(".apg-reason-other-field").hide();
      jQuery(".apg-deactivate-form-body textarea").prop('disabled', true);

      // show and enable current reason field / textarea
      jQuery("#apg-reason-other-field-"+jQuery(this).val()).show();
      jQuery("#apg-reason-other-field-"+jQuery(this).val()+" textarea").prop('disabled', false);

   });

   jQuery("#apg-deactivate-popup form").submit(function(event) {
      
      if ( ! jQuery(".apg-deactivate-form-body input[type=radio]").is(':checked') ){
         jQuery("#apg-deactivation-error-msg").show();
         return false; 
      }

   });

	jQuery("#apg_activate_button").on("click", function(e){

		e.preventDefault();
		
		var key = jQuery("#apg_activation_key").val();
		
		if( typeof key === 'undefined' || key == '' ) {
			jQuery("#apg_activation_msg").append("<p class='apg_message apg_error_mesage'>" + arcapg_admin.activation_key_is_required + "</p>");
			return false;
		}
		
		var nonce = jQuery("#check_rest_nonce").val();
		
		jQuery(".apg_loader").removeClass("apg_hidden");
		jQuery("#apg_activation_msg .apg_message").remove();
			
		jQuery.ajax({
			type: 'POST',
			url: ajaxurl,
			data: {
				"apg_activation_key" : key,
				"action" : 'check_rest',
				"check_rest_nonce" : nonce,
			},
			success: function (data) {
				data = JSON.parse(data);
				jQuery("#apg_activation_msg .apg_message").remove();
				if(typeof data['activation_key'] !== 'undefined' && parseInt(data['status']) === 1) {
					jQuery("#apg_activation_key").val(data['activation_key']);
					jQuery("#apg_activation_msg").append("<p class='apg_message apg_active_mesage'>"+ data["response_msg"] +"</p>");
					jQuery("#apg_activate_button").remove();
				} else {
					jQuery("#apg_activation_msg").append("<p class='apg_message apg_error_mesage'>"+ data["response_msg"] +"</p>");
				}
			},
			error: function(XMLHttpRequest, textStatus, errorThrown) {
				jQuery("#apg_activation_msg").append("<p class='apg_message apg_error_mesage'>" + arcapg_admin.something_went_wrong_please_try_again + "</p>");
			},
			complete : function() {
				jQuery(".apg_loader").addClass("apg_hidden");
			}
		});

	});

    // scrolling scroll container on mouse scroll
    jQuery('.apg-scroll-container').on('wheel', function (event) {
        const container = this;
        const scrollLeft = container.scrollLeft;
        const maxScrollLeft = container.scrollWidth - container.clientWidth;

        if ((event.originalEvent.deltaY > 0 && scrollLeft < maxScrollLeft) ||
            (event.originalEvent.deltaY < 0 && scrollLeft > 0)) {
            event.preventDefault();
            container.scrollLeft += event.originalEvent.deltaY;
        } else {
            event.stopPropagation();
        }
    });

});

function CopyToClipboard(id){
   var r = document.createRange();
   r.selectNode(document.getElementById(id));
   window.getSelection().removeAllRanges();
   window.getSelection().addRange(r);
   document.execCommand('copy');
   window.getSelection().removeAllRanges();
   alert(arcapg_admin.copied_to_clipboard);
}

function confirmDelete(){
   return confirm(arcapg_admin.confirm_delete);
}

function apg_confirmAction(){
    return confirm('Are you sure you want to perform this action?');
}

function CopyToClipboard(id){
   var r = document.createRange();
   r.selectNode(document.getElementById(id));
   window.getSelection().removeAllRanges();
   window.getSelection().addRange(r);
   document.execCommand('copy');
   window.getSelection().removeAllRanges();
   alert(arcapg_admin.copied_to_clipboard);
}

function generateShortcode(){
   var productid = document.getElementById("productid").value;
   var language = document.getElementById("language").value;
   var currency = document.getElementById("currency").value;

   var shortcode = '[arca-pg-form productid="'+productid+'" language="hy" currency="AMD"]';
   shortcode = shortcode.replace( /(language=")(.*?)(")/gi , "$1"+language+"$3");
   shortcode = shortcode.replace( /(currency=")(.*?)(")/gi , "$1"+currency+"$3");
   document.getElementById("shortcode-1").innerHTML = shortcode;

   var shortcode = '[arca-pg-button productid="'+productid+'" language="hy" currency="AMD"]';
   shortcode = shortcode.replace( /(language=")(.*?)(")/gi , "$1"+language+"$3");
   shortcode = shortcode.replace( /(currency=")(.*?)(")/gi , "$1"+currency+"$3");
   document.getElementById("shortcode-2").innerHTML = shortcode;
}















