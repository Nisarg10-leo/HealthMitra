var endpoint = 'https://tcs.selectorshub.info/';
$(document).ready(function () {

    chrome.storage.local.get(['ttlt'], (e) => {
        if (typeof e.ttlt == 'undefined' || e.ttlt == 'undefined' || e.ttlt ==  null || e.ttlt ==  '') {
        }else{
            checkUser(e.ttlt)
            }
        }
    )



    let logoutModal = document.querySelector(".logout_modal_container");
    $(document).on('click','.open-logout', function () {
        logoutModal.style.display = "flex";
    });

    $(".logout_modal .modal_btn.confirm").on("click", () => {
        logout();
    })

    $(".logout_modal .modal_btn.cancel").on("click", () => {
        logoutModal.style.display = "none";
    })

      let cancleModal = document.querySelector(".cancle_modal_container");
    
    $(document).on('click','#cancle-plan', function () {
        cancleModal.style.display = "flex";
    });

    $(".cancle_modal .modal_btn.confirm-cancle").on("click", () => {
         chrome.storage.local.get(['ttlt'], (e) => {
            if(e.ttlt){
                $('.cancle_modal .modal_btn.confirm-cancle').text("Please wait")
                cancleSubscription(e.ttlt);
            }
         })
       
    })

    $(".cancle_modal .modal_btn.cancel").on("click", () => {
        cancleModal.style.display = "none";
    })
});


 function checkUser(tlp){
    $.ajax({
        method: "get",
        url: endpoint + 'user/get-user-v4',
         beforeSend: function(request) {
            request.setRequestHeader("Content-type", 'application/json');
            request.setRequestHeader("Authorization", 'Bearer '+tlp);
          },
        success: function(serverResponse, txtStatus, request) {
            if(request.status == 200 && serverResponse.status){
                let isExpired = serverResponse.licenseExpired
              
                if(isExpired){
                    $(".renewsub").addClass('expired-message')
                }else{
                    $(".renewsub").removeClass('expired-message')
                }

                // v3.0.4: the ads-blocker plan list (serverResponse.plans) is no longer
                // rendered. The static Pro card in profile.html is the only upgrade path.

                if(serverResponse.showCancelButton){
                    $('#cancle-plan').show()
                }else{
                     $('#cancle-plan').hide()
                }

                if(serverResponse.subscriptionStatus =='active' && serverResponse.showUpgradeButton && (serverResponse.billingCycle == "yearly" || serverResponse.billingCycle == "monthly")){
                    $('.plan-category[data-plan-billing="monthly"], .plan-category[data-plan-billing="yearly"]').remove();
                }

                // Server still calls the free key "Free Advanced Features Key"; show the
                // same name the sign-up screen uses until the backend copy is updated.
                $(".renewsub").text(String(serverResponse.message || '').replace(/free advanced features key/ig, 'free ad-free key'));



            }else{
                logout()
            }
        },
          error: function(event, jqxhr, exception) {
            logout()
        },
        statusCode: {
        500: function(serverResponse) {
            logout()
        },
         401: function(serverResponse) {
            logout()
        }
      }
     });
 }


function logout() {
    const today = new Date();
    const expiry = new Date(today);
    expiry.setDate(today.getDate() - 365);
    chrome.storage.local.set({expiry_date: expiry.toISOString(), lastLoginOpenDate:new Date().toISOString().split('T')[0]},function(){ 
        chrome.runtime.sendMessage({message: "logout"});
        chrome.storage.local.get(['ttlt'], (e) => {
            if (typeof e.ttlt == 'undefined' || e.ttlt == 'undefined' || e.ttlt ==  null || e.ttlt ==  '') {
            }else{
                logoutUser(e.ttlt)
                chrome.storage.local.remove('ttlt', function() {});
                }
            }
        )
    });
}


function logoutUser(tlp){
    $.ajax({
        method: "get",
        url: endpoint + 'user/logout',
         beforeSend: function(request) {
            request.setRequestHeader("Content-type", 'application/json');
            request.setRequestHeader("Authorization", 'Bearer '+tlp);
          },
        success: function(serverResponse, txtStatus, request) {
            window.close()
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


function cancleSubscription(tlp){
    $.ajax({
        method: "get",
        url: endpoint + 'user/cancle-subscription',
         beforeSend: function(request) {
            request.setRequestHeader("Content-type", 'application/json');
            request.setRequestHeader("Authorization", 'Bearer '+tlp);
          },
        success: function(serverResponse, txtStatus, request) {
            if(request.status == 200){
                let cancleModal = document.querySelector(".cancle_modal_container");

                $('.cancle_modal_container .modal_description').text(serverResponse.message)
                setTimeout(()=>{
                    cancleModal.style.display = "none";
                }, 3000);
             
                checkUser(tlp);
            }else{
                logout()
            }
        },
          error: function(event, jqxhr, exception) {
            logout()
        },
        statusCode: {
        500: function(serverResponse) {
            logout()
        },
         401: function(serverResponse) {
            logout()
        }
      }
     });
}