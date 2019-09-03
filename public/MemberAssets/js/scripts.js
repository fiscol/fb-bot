
jQuery(document).ready(function() {
    // 切換Login或SignUp
    $('#signupForm').hide();
    $('#signupTitle').hide(); 

    $('#loginSwitch').click(function(){ 
        $('#loginForm').show(); 
        $('#loginTitle').show(); 
        $('#signupForm').hide(); 
        $('#signupTitle').hide(); 
    });
    $('#signupSwitch').click(function(){ 
        $('#loginForm').hide(); 
        $('#loginTitle').hide(); 
        $('#signupForm').show(); 
        $('#signupTitle').show(); 
    });	
    /*
        Fullscreen background
    */
    $.backstretch("../../MemberAssets/img/backgrounds/EILIS_BackGround.jpg");
    
    /*
        Form validation
    */
    $('.login-form input[type="text"], .login-form input[type="password"], .login-form textarea').on('focus', function() {
    	$(this).removeClass('input-error');
    });
    
    $('.login-form').on('submit', function(e) {
    	
    	$(this).find('input[type="text"], input[type="password"], textarea').each(function(){
    		if( $(this).val() == "" ) {
    			e.preventDefault();
    			$(this).addClass('input-error');
    		}
    		else {
    			$(this).removeClass('input-error');
    		}
    	});
    	
    });


    
    
});
