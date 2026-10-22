var endpoint = 'https://tcs.selectorshub.info/';

// Pro is the only paid product shown in the free extension.
const PRO_PLANS_URL = 'https://selectorshub.com/testcase-studio-pro/plans/';

let resendTimer;

function startCountdown() {
    let timeLeft = 60;
    const $btn = $("#resend_btn");

    // Disable button and show timer
    $btn.prop("disabled", true).css("opacity", "0.6");
    $btn.val(`Resend in ${timeLeft}s`);

    // Start interval countdown
    resendTimer = setInterval(function() {
        timeLeft--;
        $btn.val(`Resend in ${timeLeft}s`);

        if (timeLeft <= 0) {
            clearInterval(resendTimer);
            $btn.prop("disabled", false).css("opacity", "1");
            $btn.val("Resend verification code");
        }
    }, 1000);
}
 
 function checkSessionId() {
     chrome.storage.local.get(['ttlt'], (e) => {
       
         if (typeof e.ttlt == 'undefined' || e.ttlt == 'undefined' || e.ttlt ==  null || e.ttlt ==  '') {
          
           $('.popup__actions__container').removeClass('update-upgrade-panel')
           $('.patronRequest .after-login').hide();
           $('.upgradeBtn.top.home-login-btn').show()
           $('.upgradeBtn.top.after-login-top-upgrade').hide()
         }else{
           
            // checkUser(e.ttlt)
            $('.popup__actions__container').addClass('update-upgrade-panel')
            $('.patronRequest').children(':not(.after-login)').hide();
            $('.patronRequest .after-login').show();
            $('.upgradeBtn.top.home-login-btn').hide()
            $('.upgradeBtn.top.after-login-top-upgrade').show()
         }
     }); 
 }
 
 
 
 $(document).ready(function () {
    $("#email-f").on('keyup', function (e) {
        if (e.key === 'Enter' || e.keyCode === 13) {
            $('.forgetbtn').click();
        }
    });
    
    $("#password").on('keyup', function (e) {
        if (e.key === 'Enter' || e.keyCode === 13) {
            $('#submit_btn').click();
        }
    });
 
 
 
    //  $('.open-forgot-password').click(function(){
    //     $('.email-container, .forgetbtn, #open_login, #login-container').show()
    //     $('.licence-container, #submit_btn, #forgot_pass, .register-container').hide()

    //  })

    $(document).on('click','#forgot_pass',function(){
        showLoginView()
        $('#login-container .view-title').text('Recover your key')
        $('#login-container .view-sub').text("Enter your email and we'll send your key again.")
        $('.email-container, .forgetbtn, #open_login').show()
        $('.licence-container, #submit_btn, #forgot_pass').hide()
     });
 
     $(document).on('click', '.open-login, .open-login-inline', function(e){
        e.preventDefault()
        showLoginView()
     })

     $(document).on('click', '.switch-to-signup', function(e){
        e.preventDefault()
        showRegForm()
     })
     
 
      $('.forgetbtn').click(function(){
         let user_email = document.getElementById("email").value.trim();
        loading(true);
 
          $('.forgetbtn').prop('disabled', true); 
        $('.forgetbtn').val('Please wait') 
            $.ajax({
             method: "POST",
             url: endpoint + 'user/sendforgot',
              beforeSend: function(request) {
                 request.setRequestHeader("Content-type", 'application/json');
               },
             data:  JSON.stringify({email:user_email}),
             success: function(serverResponse, txtStatus, request) {
                loading(false); 
                      $('.forgetbtn').prop('disabled', false); 
                         $('.forgetbtn').val('Submit') 
                 if(request.status == 200 && serverResponse.status){
                        $('.user-status').text(serverResponse.message).css('color','green').slideDown();
                     setTimeout(()=>{$('.user-status').slideUp();},5000)
                    
                   }else{
                    chrome.storage.local.remove('ttlt');
                     $('.user-status').text(serverResponse.message).css('color','red').slideDown();
                     setTimeout(()=>{$('.user-status').slideUp();},5000)
                 }
             },
               error: function(event, jqxhr, exception) {
             },
             statusCode: {
             500: function(serverResponse) {
          
             },
              401: function(serverResponse) {
            
             }
           }
          });
       
 
         })
 
 
     $('#submit_btn').click(function(){
        let user_email = document.getElementById("licence").value.trim();

        if(user_email==''){
            $('#licence').focus()
            return false
        }

        loading(true);
 
        $('#submit_btn').prop('disabled', true); 
        $('#submit_btn').val('Please wait') 
 
            $.ajax({
             method: "POST",
             url: endpoint + 'user/login',
              beforeSend: function(request) {
                 request.setRequestHeader("Content-type", 'application/json');
               },
             data:  JSON.stringify({lk:user_email}),
             success: function(serverResponse, txtStatus, request) {
                loading(false); 
              $('#submit_btn').prop('disabled', false); 
                 $('#submit_btn').val('Login') 
                 if(request.status == 200 && serverResponse.status){
                       chrome.storage.local.set({ttlt:serverResponse.token});
                       ttlt = serverResponse.token; 
                       chrome.storage.local.set({data:serverResponse.data,messages:serverResponse.messages}, function(){
                            
                             chrome.runtime.sendMessage({message: "loggedin"}, function(response) {})
                       });
                   }else{
                        $('#submit_btn').prop('disabled', false); 
                        $('#submit_btn').val('Login') 
                        chrome.storage.local.remove('ttlt');
                        $('.subscription-status').text(serverResponse.message).slideDown();
                        setTimeout(()=>{$('.subscription-status').slideUp();},5000)

                        if(serverResponse.message.indexOf('Already') > -1){
                            $('#three-modal').show();
                        }
                 }
             },
               error: function(event, jqxhr, exception) {
                     loading(false)
                     $('#submit_btn').prop('disabled', false); 
                     $('#submit_btn').val('Login') 
                     $('.invalid-error.invalid-credentails').text('Invalid credentials').slideDown()
                    setTimeout(function(){ document.getElementsByClassName('invalid-credentails')[0].style.display = 'none'; },3000);
             },
             statusCode: {
             500: function(serverResponse) {
          
             },
              401: function(serverResponse) {
                 loading(false)
                     $('#submit_btn').prop('disabled', false); 
                     $('#submit_btn').val('Login') 
                 $('.invalid-error.invalid-credentails').text('Invalid credentials').slideDown()
                 setTimeout(function(){ 
                     document.getElementsByClassName('invalid-credentails').style.display = 'none';
                 },3000);
             }
           }
          });
       
 
         })
 

             $('#re_submit_btn').click(function(){
         let user_email = document.getElementById("re_licence").value.trim();

         if(user_email==''){
            $('#re_licence').focus()
            return false
        }

        loading(true);
 
        $('#re_submit_btn').prop('disabled', true); 
        $('#re_submit_btn').val('Please wait') 
 
            $.ajax({
             method: "POST",
             url: endpoint + 'user/login',
              beforeSend: function(request) {
                 request.setRequestHeader("Content-type", 'application/json');
               },
             data:  JSON.stringify({lk:user_email}),
             success: function(serverResponse, txtStatus, request) {
                loading(false); 
              $('#re_submit_btn').prop('disabled', false); 
                 $('#re_submit_btn').val('Login') 
                 if(request.status == 200 && serverResponse.status){
                       chrome.storage.local.set({ttlt:serverResponse.token});
                       ttlt = serverResponse.token; 
                       chrome.storage.local.set({data:serverResponse.data,messages:serverResponse.messages}, function(){
                             chrome.runtime.sendMessage({message: "loggedin"}, function(response) {})
                       });
                   }else{
                        $('#re_submit_btn').prop('disabled', false); 
                        $('#re_submit_btn').val('Login') 
                        chrome.storage.local.remove('ttlt');
                        $('.subscription-status').text(serverResponse.message).slideDown();
                        setTimeout(()=>{$('.subscription-status').slideUp();},5000)

                        if(serverResponse.message.indexOf('Already') > -1){
                            $('#three-modal').show();
                        }
                 }
             },
               error: function(event, jqxhr, exception) {
                     loading(false)
                     $('#re_submit_btn').prop('disabled', false); 
                     $('#re_submit_btn').val('Login') 
                     $('.invalid-error.invalid-credentails').text('Invalid credentials').slideDown()
                    setTimeout(function(){ document.getElementsByClassName('invalid-credentails')[0].style.display = 'none'; },3000);
             },
             statusCode: {
             500: function(serverResponse) {
          
             },
              401: function(serverResponse) {
                 loading(false)
                     $('#submit_btn').prop('disabled', false); 
                     $('#submit_btn').val('Login') 
                 $('.invalid-error.invalid-credentails').text('Invalid credentials').slideDown()
                 setTimeout(function(){ 
                     document.getElementsByClassName('invalid-credentails').style.display = 'none';
                 },3000);
             }
           }
          });
       
 
         })

     $('#resend_btn').click(function(){
         let userEmail = document.getElementById("re-email").value.trim();
         let reFullName = document.getElementById("re-full-name").value.trim();
        

        loading(true);
 
        $('.re-actions').prop('disabled', true); 
        $('#resend_btn').val('Please wait') 
 
        startCountdown()
            $.ajax({
             method: "POST",
             url: endpoint + 'user/resend-code',
            beforeSend: function(request) {
                request.setRequestHeader("Content-type", 'application/json');
                request.setRequestHeader("D", 'tcs');
            },
             data:  JSON.stringify({email:userEmail, name:reFullName}),
             success: function(serverResponse, txtStatus, request) {
                loading(false); 
                $('.re-actions').prop('disabled', false); 
                $('#resend_btn').val('Resend verification code') 
                 if(request.status == 200 && serverResponse.status){
                   showServerMessage(serverResponse.message, "success")
                 }else{
                    showServerMessage(serverResponse.message, "error")
                 }
             },
               error: function(event, jqxhr, exception) {
                     loading(false)
              },
             statusCode: {
             500: function(serverResponse) {
          
             },
              401: function(serverResponse) {
               
             }
           }
          });
       
 
         })



     $('#verify_btn').click(function(){
         let userEmail = document.getElementById("re-email").value.trim();
         let reFullName = document.getElementById("re-full-name").value.trim();
         let otpCode = document.getElementById("otp-code").value.trim();

         if(otpCode==''){ $("#otp-code").focus(); return false}

        loading(true);
 
        $('.re-actions').prop('disabled', true); 
        $('#verify_btn').val('Please wait') 
 
            $.ajax({
             method: "POST",
             url: endpoint + 'user/verify-code',
            beforeSend: function(request) {
                request.setRequestHeader("Content-type", 'application/json');
                request.setRequestHeader("D", 'tcs');
            },
             data:  JSON.stringify({email:userEmail, name:reFullName, otp:otpCode}),
             success: function(serverResponse, txtStatus, request) {
                loading(false); 
                $('.re-actions').prop('disabled', false); 
                $('#verify_btn').val('Submit') 
                 if(request.status == 200 && serverResponse.status){
                    //showServerMessage(serverResponse.message, "success")
                    // $('.subscription-status').text(serverResponse.message).slideDown();
                    // setTimeout(()=>{$('.subscription-status').slideUp();},5000)
                    // $(".back-btn").click();
                    showServerMessage(serverResponse.message, "success")
                   

                    $("#verify_btn, #resend_btn, .re-otp-container").hide()
                    $(".re-licence-input-container, #re_submit_btn").show()


                 }else{
                    showServerMessage(serverResponse.message, "error")
                 }
             },
               error: function(event, jqxhr, exception) {
                     loading(false)
              },
             statusCode: {
             500: function(serverResponse) {
          
             },
              401: function(serverResponse) {
               
             }
           }
          });
       
 
         })

    $('#register_btn').click(function(){
         let userEmail = document.getElementById("re-email").value.trim();
         let reFullName = document.getElementById("re-full-name").value.trim();

         if (reFullName === "") {
            $("#re-full-name").focus();
            return false;
        }

         if(userEmail==''){
             $("#re-email").focus();
            return false
        }

        loading(true);
 
        $('.re-actions').prop('disabled', true); 
       // $('#submit_btn').val('Please wait') 
 
            $.ajax({
             method: "POST",
             url: endpoint + 'user/register',
              beforeSend: function(request) {
                 request.setRequestHeader("Content-type", 'application/json');
                 request.setRequestHeader("D", 'tcs');
               },
             data:  JSON.stringify({email:userEmail, name:reFullName, provider: "app"}),
             success: function(serverResponse, txtStatus, request) {
                loading(false); 
                $('.re-actions').prop('disabled', false); 
                 if(request.status == 200 && serverResponse.status){
                   showServerMessage(serverResponse.message, "success")
                   $("#resend_btn").show()
                   startCountdown();
                 }else{
                    showServerMessage(serverResponse.message, "error")
                 }
             },
               error: function(event, jqxhr, exception) {
                loading(false)
              },
             statusCode: {
             500: function(serverResponse) {
          
             },
              401: function(serverResponse) {
               
             }
           }
          });
       
 
         })




     $(document).on('click','.logout-btn',function(){
        logout()
     })


    $('#registration_tutorial').on('click', function () {
        chrome.runtime.sendMessage({ action: "open_help_doc", data:{url: 'https://youtu.be/uX9P0uvDzYA', active:true} });
    });

    $(document).on('click', '.get-pro-link', function (e) {
        e.preventDefault()
        chrome.runtime.sendMessage({ action: "open_help_doc", data:{url: PRO_PLANS_URL, active:true} });
    });
       
  
    $(document).on('click','.home-login-btn',function(){
        document.querySelector(".container").style.display="none";
        document.querySelector("#register_form").style.display="block";
        document.querySelector(".top_ads__viewer").style.display="none";
        setTimeout(()=>{document.querySelector(".top_ads__viewer").style.display="none";},200)
     });

     checkSessionId();

     $(document).on('click','.close-modal',function(){
          window.location.href = window.location.href.replace('login.html', 'studioWindow.html')
     });

     $(document).on('click','.device-close',function(){
        let num = parseInt($(this).attr('data-num'))

        let user_email = document.getElementById("licence").value.trim();

        if(user_email==''){return false}
        $('#three-modal').hide()
        loading(true);

        $('#submit_btn').prop('disabled', true); 
        $('#submit_btn').val('Please wait') 

           $.ajax({
            method: "POST",
            url: endpoint + 'user/remove',
             beforeSend: function(request) {
                request.setRequestHeader("Content-type", 'application/json');
              },
            data:  JSON.stringify({lk:user_email, num:num}),
            success: function(serverResponse, txtStatus, request) {
               loading(false); 
             $('#submit_btn').prop('disabled', false); 
                $('#submit_btn').val('Login') 
                if(request.status == 200 && serverResponse.status){
                      chrome.storage.local.set({ttlt:serverResponse.token});
                      ttlt = serverResponse.token; 
                      chrome.storage.local.set({data:serverResponse.data,messages:serverResponse.messages}, function(){
                          
                            chrome.runtime.sendMessage({message: "loggedin"}, function(response) {})
                      });
                  }else{
                       $('#submit_btn').prop('disabled', false); 
                       $('#submit_btn').val('Login') 
                       chrome.storage.local.remove('ttlt');
                       $('.subscription-status').text(serverResponse.message).slideDown();
                       setTimeout(()=>{$('.subscription-status').slideUp();},5000)

                       if(serverResponse.message.indexOf('Already') > -1){
                           $('#three-modal').show();
                       }
                }
            },
              error: function(event, jqxhr, exception) {
                    loading(false)
                    $('#submit_btn').prop('disabled', false); 
                    $('#submit_btn').val('Login') 
                    $('.invalid-error.invalid-credentails').text('Invalid credentials').slideDown()
                   setTimeout(function(){ document.getElementsByClassName('invalid-credentails')[0].style.display = 'none'; },3000);
            },
            statusCode: {
            500: function(serverResponse) {
         
            },
             401: function(serverResponse) {
                loading(false)
                    $('#submit_btn').prop('disabled', false); 
                    $('#submit_btn').val('Login') 
                $('.invalid-error.invalid-credentails').text('Invalid credentials').slideDown()
                setTimeout(function(){ 
                    document.getElementsByClassName('invalid-credentails').style.display = 'none';
                },3000);
            }
          }
         });


     })


     $(document).on('click','#close_btn',function(){
      window.location.href = window.location.href.replace('login.html', 'studioWindow.html')
     })

    

     

 })
 
 function loading(show) {
     if (show) {
         $('.loading-view').show()
     }else{
         $('.loading-view').hide()
     }
 }
 
 
 function logout() {

    $('.patronRequest').children(':not(.after-login)').show();
    $('.patronRequest .after-login').hide();
    chrome.storage.local.get(['ttlt'], (e) => {
        if (typeof e.ttlt == 'undefined' || e.ttlt == 'undefined' || e.ttlt ==  null || e.ttlt ==  '') {
        }else{
           logoutUser(e.ttlt)
            chrome.storage.local.remove('ttlt', function() {
                        $('.upgradeBtn.top.home-login-btn').show()
                        $('.upgradeBtn.top.after-login-top-upgrade').hide()  
                        checkSessionId()
                        if (chrome.runtime.lastError) {
                            console.error(`Error removing key 'ttlt': ${chrome.runtime.lastError}`);
                        } else {
                            console.log("Key 'ttlt' removed successfully.");
                        }
            });

           

            }
        }
    )

   

    $('.after-login-footer').hide()
    $('.ads__text, .ads__container, .ads__viewer, .image__ad, .top_ads__viewer, #image-ads').show()
    $('.popup__actions__container').removeClass('update-upgrade-panel')
  
    $('.patronRequest').show();
 }


 function logoutUser(tlp){
    $('.patronRequest').children(':not(.after-login)').show();
    $('.patronRequest .after-login').hide();
    $.ajax({
        method: "get",
        url: endpoint + 'user/logout',
         beforeSend: function(request) {
            request.setRequestHeader("Content-type", 'application/json');
            request.setRequestHeader("Authorization", 'Bearer '+tlp);
          },
        success: function(serverResponse, txtStatus, request) {
        },
          error: function(event, jqxhr, exception) {
           
        },
        statusCode: {
        500: function(serverResponse) {
           
        },
         401: function(serverResponse) {
            
        }
      }
     });
 }

 

 chrome.runtime.onMessage.addListener(function (
    message,
    sender,
    sendResponse
  ) {
    console.log('login.js received message:', message);
  if(message.logout){
    logout()
  }else if (message.closed === true) {
        window.close();
    }else if(message.type === "show_registration_popup"){
        showRegForm();
    }
  })

function showRegForm(){
    $('.register-container').show()
    $('#login-container, #open_login').hide()
    $('#forgot_pass').show()
}

function showLoginView(){
    $('#login-container .view-title').text('Log in')
    $('#login-container .view-sub').text('Enter the key we emailed you.')
    $('.register-container, .email-container, .forgetbtn, #open_login').hide()
    $('#login-container, .licence-container, #submit_btn, #forgot_pass').show()
}

 function showServerMessage(message, type = "info") {
    const $msg = $(".server-message");
    let color;

    switch (type) {
        case "success":
            color = "#2ec52e";
            break;
        case "error":
            color = "#c55555";
            break;
        case "warning":
            color = "orange";
            break;
        case "info":
        default:
            color = "blue";
            break;
    }

     $msg.stop(true, true) // stop any ongoing animation
        .text(message)
        .css({
            "color": color,
            "font-weight": "bold"
        })
        .slideDown(300); // slide down smoothly

    // Slide up after 3 seconds
    setTimeout(() => {
        $msg.slideUp(300);
    }, 15000);
}
