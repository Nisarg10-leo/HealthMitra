var endpoint = 'https://tcs.selectorshub.info/';


 function checkSessionId() {
    giveAccess(false, false);
    return;
     browserType.storage.local.get(['ttlt', "expiry_date", "has_free_access"], (e) => {
       
         if (typeof e.ttlt == 'undefined' || e.ttlt == 'undefined' || e.ttlt ==  null || e.ttlt ==  '') {
           if (!e.expiry_date){
                try {
                    fetch(endpoint+"user/limit")
                        .then((res) => res.json())
                        .then((data) => {
                          if (!data || typeof data.free_access !== "number") {
                            throw new Error("Invalid response: free_days missing or not a number");
                            }
                            const today = new Date();
                            const expiry = new Date(today);
                            expiry.setDate(today.getDate() + data.free_access);

                            if (isNaN(expiry.getTime())) {
                            throw new Error("Expiry date calculation failed");
                            }
                            chrome.storage.local.set(
                            {
                                start_date: today.toISOString(),
                                expiry_date: expiry.toISOString(),
                                has_free_access: true,
                                free_days: data.free_access,
                            },
                            () => {
                                if (chrome.runtime.lastError) {
                                    console.error("Failed to save data:", chrome.runtime.lastError);
                                } else {

                                    const now = new Date();
                                    const expiry = new Date(e.expiry_date);

                                    if (now > expiry) {
                                        giveAccess(true, false)

                                        setTimeout(()=>{
                                            openLoginForm()
                                        },3000)
                                    }else{
                                        giveAccess(false, false)
                                    }

                                    return false;
                                
                                }
                            }
                            );
                        })
                        .catch((err) => {
                            console.error("Failed to fetch free days:", err);
                        });

                }catch (err) {
                    console.error(`Error during ${type} fetch:`, err);
                }
            }else{
                const now1 = new Date();
                const expiry = new Date(e.expiry_date);
                if (now1 > expiry) {
                    giveAccess(true, false)
                    setTimeout(()=>{
                        openLoginForm()
                    },3000)
                }else{
                  giveAccess(false, false)
                }   
            }
         }else{
            checkUser(e.ttlt)
         }
     }); 
 }
 
 function giveAccess(isExpired, isLoggedIn){
    allow = false;
  if(isExpired==false){
      $('.right__section').remove();
      $('.popup__actions__container').addClass('update-upgrade-panel')
      $('.patronRequest').children(':not(.after-login)').hide();
      $('.patronRequest .after-login').show();
      $('.upgradeBtn.top.home-login-btn').hide()
      $('.upgradeBtn.top.after-login-top-upgrade').show()
      $('.profile, .profile-hide').show()
     
      $('.ads__text, .ads__container, .ads__viewer, .image__ad, .top_ads__viewer, #image-ads').hide()
      $('.after-login-footer').show()
      $('.patronRequest').removeClass('hideElement')
      browserType.storage.local.remove('fetched_ads')
      $(".go-ads-btn-divider, .outer-login-button").remove()
      displayAll([])
      browserType.runtime.sendMessage({ action: "updateContextMenuAfterLogin" });
  }else{
    allow = true;
    fetchingUpdates()
  }

  if(!isExpired && !isLoggedIn){
    //future use if needed
  }

  if(isLoggedIn){
      $(".login-btn-divider, .login-btn").remove()
  }else{
    $('.popup__actions__container').removeClass('update-upgrade-panel')
    $('.patronRequest .after-login').hide();
    $('.upgradeBtn.top.home-login-btn').show()
    $('.upgradeBtn.top.after-login-top-upgrade').hide()
    $('.profile, .profile-hide').remove()
  }
 }

/* ──────────────────────────────────────────────────────────────────────────
 * Login / registration window — exactly one, ever.
 *
 * Previously every route to the login popup called chrome.windows.create()
 * for itself, which stacked up windows the user then had to close one by one:
 *
 *   - openLoginForm() fired $('.home-login-btn').click(), and there are TWO
 *     elements with that class in the studio markup, so one expiry opened two
 *     windows.
 *   - The click handler queried for existing login tabs and then created a new
 *     window. Two clicks in quick succession both saw "none open" before
 *     either had created anything, so both created one.
 *   - Only tabs whose URL started with login.html were closed, so a popup that
 *     had navigated on (to studioWindow.html after a successful login, say)
 *     was invisible to the check and left behind.
 *
 * Everything now goes through showLoginWindow(). It focuses the window that is
 * already open rather than replacing it, so a half-typed email survives, and
 * it closes any duplicates it finds — which also cleans up after the old code
 * for users who already have a pile of them.
 * ────────────────────────────────────────────────────────────────────────── */

var tcsLoginWindowId = null;      // window we opened, if it is still around
var tcsLoginWindowPending = null; // in-flight open, so parallel calls collapse

// If the user closes the popup themselves, stop pointing at a dead window.
if (chrome.windows && chrome.windows.onRemoved) {
    chrome.windows.onRemoved.addListener(function (windowId) {
        if (windowId === tcsLoginWindowId) tcsLoginWindowId = null;
    });
}

function tcsFindLoginTabs() {
    const targetUrl = chrome.runtime.getURL("testCaseStudio/login.html");
    return new Promise(function (resolve) {
        chrome.tabs.query({}, function (tabs) {
            if (chrome.runtime.lastError) return resolve([]);
            resolve((tabs || []).filter(function (tab) {
                return tab && tab.url && tab.url.split("#")[0].split("?")[0] === targetUrl;
            }));
        });
    });
}

function tcsFocusWindow(windowId, tabId) {
    return new Promise(function (resolve) {
        chrome.windows.update(windowId, { focused: true, drawAttention: true }, function () {
            // Reading lastError keeps a closed-window race from logging an error.
            void chrome.runtime.lastError;
            if (tabId) chrome.tabs.update(tabId, { active: true }, function () { void chrome.runtime.lastError; });
            resolve(true);
        });
    });
}

/*
 * Brings the login window to the front, or opens it if there is none.
 * Safe to call from anywhere, as often as you like.
 */
function showLoginWindow() {
    if (tcsLoginWindowPending) return tcsLoginWindowPending;

    tcsLoginWindowPending = (async function () {
        try {
            const existing = await tcsFindLoginTabs();

            if (existing.length) {
                // Keep the first, discard any extras left over from before.
                const keep = existing[0];
                const extras = existing.slice(1).map(function (t) { return t.id; }).filter(Boolean);
                if (extras.length) {
                    await new Promise(function (resolve) {
                        chrome.tabs.remove(extras, function () { void chrome.runtime.lastError; resolve(); });
                    });
                }
                tcsLoginWindowId = keep.windowId;
                await tcsFocusWindow(keep.windowId, keep.id);
                return tcsLoginWindowId;
            }

            const created = await new Promise(function (resolve) {
                chrome.windows.create({
                    url: chrome.runtime.getURL("testCaseStudio/login.html"),
                    type: "popup",
                    height: 630,
                    width: 400
                }, function (win) { void chrome.runtime.lastError; resolve(win); });
            });

            tcsLoginWindowId = created && created.id ? created.id : null;
            return tcsLoginWindowId;
        } catch (e) {
            console.error("Error opening login window:", e);
            return null;
        } finally {
            // Released only after the window exists, so a second call during
            // the create sees it in the query instead of making another.
            tcsLoginWindowPending = null;
        }
    })();

    return tcsLoginWindowPending;
}

// Guards the once-a-day auto-open against checkSessionId() running more than
// once in a session — the stored date is written asynchronously, so two runs
// could both read yesterday's value and both proceed.
var tcsLoginFormRequested = false;

 function openLoginForm() {
    if (tcsLoginFormRequested) return;
    tcsLoginFormRequested = true;

    const STORAGE_KEY = 'lastLoginOpenDate';
    const today = new Date().toISOString().split('T')[0];

    chrome.storage.local.get(STORAGE_KEY, function (result) {
        const savedDate = result[STORAGE_KEY];
        // First time OR date changed
       if (!savedDate || savedDate !== today) {
            $.ajax({
             method: "GET",
             url: endpoint + 'user/regshow',
            beforeSend: function(request) {
                request.setRequestHeader("Content-type", 'application/json');
                request.setRequestHeader("D", 'testcase');
            },
             success: function(serverResponse, txtStatus, request) {
                 if(request.status == 200 && serverResponse.status && serverResponse.allowed){
                    /*
                     * Was $('.home-login-btn').click(), which matches two
                     * elements in the studio markup and so opened two windows.
                     * Now one window, and the "switch to the register form"
                     * message goes out only once it is actually open — twice,
                     * spaced out, because a freshly created popup may not have
                     * registered its listener yet. login.js only shows the
                     * register view, so the repeat is harmless.
                     */
                    showLoginWindow().then(function () {
                        [600, 1600].forEach(function (delay) {
                            setTimeout(function () {
                                chrome.runtime.sendMessage({ type: "show_registration_popup" }, function () {
                                    void chrome.runtime.lastError;
                                });
                            }, delay);
                        });
                    });

                    // Save today's date using the Chrome storage API
                    chrome.storage.local.set({
                        [STORAGE_KEY]: today
                    });
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
        }
    });
}

hitCounterApiIfDateChanged();
function hitCounterApiIfDateChanged() {
    const STORAGE_KEY = 'user_counter_last_hit_date';
    const today = new Date().toISOString().split('T')[0];

    chrome.storage.local.get([STORAGE_KEY], function(result) {
        const storedDate = result[STORAGE_KEY];

        if (storedDate !== today) {
            $.ajax({
                method: "GET",
                url: endpoint + 'user/counter',
                beforeSend: function (request) {
                    request.setRequestHeader("Content-type", 'application/json');
                    request.setRequestHeader("D", 'tcs');
                },
                success: function (serverResponse) {
                    // Save today's date using the Chrome storage API
                    let data = {};
                    data[STORAGE_KEY] = today;
                    
                    chrome.storage.local.set(data, function() {
                    });
                },
                error: function (event, jqxhr, exception) {
                    // Error handling
                },
                statusCode: {
                    500: function () {},
                    401: function () {}
                }
            });
        }
    });
}
 
 $(document).ready(function () {
   checkSessionId();
    $('.profile').click(function(){
        chrome.windows.create({
              url: chrome.runtime.getURL("testCaseStudio/profile.html"),
              type: "popup",
              height: 520,
              width: 600,
          }).then(function () {
          }).catch(function (e) {
          });

  });
     
     $(document).on('click','.logout-btn',function(){
        logout()
     })
       

     
  
    $(document).on('click','.login-btn, .home-login-btn',function(){

        if($(this).attr("data-upgrade-url")){
            window.open($(this).attr("data-upgrade-url"), "_blank");
            return;
        }

        showLoginWindow();

     });

   

 })

 
 function logout() {

    $('.patronRequest').children(':not(.after-login)').show();
    $('.patronRequest .after-login').hide();
    browserType.storage.local.get(['ttlt'], (e) => {
        if (typeof e.ttlt == 'undefined' || e.ttlt == 'undefined' || e.ttlt ==  null || e.ttlt ==  '') {
        }else{
              logoutUser(e.ttlt)
              browserType.storage.local.remove('ttlt', function() {
                $('.upgradeBtn.top.home-login-btn').show()
                $('.upgradeBtn.top.after-login-top-upgrade').hide()  
                const today = new Date();
                const expiry = new Date(today);
                expiry.setDate(today.getDate() - 365);
                chrome.storage.local.set({expiry_date: expiry.toISOString()},function(){ 
                  checkSessionId()
                });
                if (browserType.runtime.lastError) {
                    console.error(`Error removing key 'ttlt': ${browserType.runtime.lastError}`);
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
    fetchingUpdates()
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
  
 function checkUser(tlp){
  
    $.ajax({
        method: "get", 
        cache: false,
        url: endpoint + 'user/get-user-v2',
         beforeSend: function(request) {
            request.setRequestHeader("Content-type", 'application/json');
            request.setRequestHeader("Authorization", 'Bearer '+tlp);
          },
        success: function(serverResponse, txtStatus, request) {
            if(request.status == 200 && serverResponse.status){
               giveAccess(serverResponse.licenseExpired, true)

                if(serverResponse.showUpgrade) {
                  $('.login-btn, .home-login-btn').attr("data-upgrade-url", serverResponse.upgradeUrl);
                }

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

 chrome.runtime.onMessage.addListener(function (
    message,
    sender,
    sendResponse
  ) {
// console.log( message);
  if(message.message == 'logout'){
    window.location.reload()
  }

  if(message.message == "loggedin"){
    console.log('Reloading home window as per request');
    chrome.tabs.remove(sender.tab.id);
    window.location.reload()
  }

  })