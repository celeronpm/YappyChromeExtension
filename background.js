var apiHost = 'https://api.yappy.im';
var isConnected = false;
var loginwindowopened = 0;
var openLoginWindowTime = 1000 * 60 * 10;
var isLoggingIn = false;
var remind = true;

$(document).ready(function() {
    SaveLoggedIn(false);

    //Check on connection
    setInterval(function() {
        if (isConnected) {
            return;
        }
        startup();
    }, 10000);
    startup();

});
	
function startup() {

    if (isLoggingIn == true) {
        return;
    }

    isLoggingIn == true;

    //Check if we are logged in to Yappy
    $.get(apiHost + '/Chrome/IsLoggedIn')
        .success(function(data) {
            isLoggingIn == false;
			
            //We are logged in, conect to Message Bus to recieve notifications
            if (data == true) {
                SaveLoggedIn(true);
                connect();				
				//setupContextMenus();				
            } else {
                if (new Date().getTime() - loginwindowopened > 1000 * 60 * 10 && remind == true) //Open login window every 10 minutes
                {
                    if (confirm('Please login with your Google credentials to use the Yappy extension.\rClick cancel to not be reminded to log in until you restart Chrome.')) {
                        loginwindowopened = new Date().getTime();

                        chrome.tabs.create({
                            url: apiHost + '/LoggedIn',
                            active: false
                        }, function(tab) {
                            // After the tab has been created, open a window to inject the tab
                            chrome.windows.create({
                                tabId: tab.id,
                                type: 'popup',
                                focused: true,
                                height: 350,
                                width: 430
                            });
                        });
                    } else {
                        remind = false;
                    }

                }
                SaveLoggedIn(false);
            }
        })
        .error(function() {
            isLoggingIn == false;
            SaveLoggedIn(false);
        });
}

var notifications = new Array();

function setupContextMenus() {
		//chrome.contextMenus.removeAll();
  
		//var parent = chrome.contextMenus.create({"title": "Bark via Yappy",  
		//		"contexts": ["page", "selection", "image", "link"],
		//		"onclick" : clickHandler}); 
}

var clickHandler = function(info, tab) {
	
	 var bark = { };

        if (info.srcUrl) {
				bark.type = 'url';
                bark.title = imageNameFromUrl(info.srcUrl);
                bark.url = info.srcUrl;
				
                Bark(bark, info.srcUrl);
                return;            
        } else if (info.linkUrl) {
            bark.type = 'url';
            bark.title = info.selectionText;
            bark.url = info.linkUrl;
        } else if (info.selectionText) {
            bark.type = 'text';
            bark.body = info.selectionText;
        } else {
            bark.type = 'url';
            bark.title = tab.title;
            bark.url = info.pageUrl;
        }

        Bark(bark);	
};

function connect() {

    var chatHub = $.connection.chatHub;
    $.connection.hub.url = apiHost + "/signalr";
    var pendingNotifications = {};
	var reconnectTimeout;
	var echoInterval;
	var isReconnecting = true;
	
    chatHub.client.addChromeMessage = function(message) {

        var keys = ["HideNotification", "HidePhone", "HideName", "HidePhoto", "HideMessage", "HideImage", "Timeout"];
        chrome.storage.local.get(keys, function(result) {

            var timerTimout = 5000;

            if (result["Timeout"] != null) {
                timerTimout = result["Timeout"];
            };

            if (result["HideNotification"] == true) {
                return;
            };

            var myTitle = "";
            if (result["HideName"] != true) {
                myTitle += message.Name;
            };
            
			if (result["HidePhone"] != true && message.Phone != null && message.Phone != "") {
                if (myTitle != "") {
                    myTitle += " - ";
                }
                myTitle += message.Phone;
            };

            if (myTitle == "") {
                myTitle = "New message";
            };

            if (message.Image != null && result["HideImage"] == true) {
                message.Text += ((message.Text != null && message.Text != '') ? "\n" : "") +
                    "[MMS IMAGE]";
            }

            var myNotificationID = null;
            var options = {
                type: (message.Image == null || result["HideImage"] == true) ? "basic" : "image",
                title: myTitle,
                priority: 2,
                message: result["HideMessage"] == true ? "New Messsage" : message.Text,
                iconUrl: result["HidePhoto"] == true ? "/images/icon_80.png" : apiHost + "/avatar/" + message.Avatar,
                imageUrl: (message.Image != null && result["HideImage"] != true) ? message.Image.replace("MMS", "MMSPreview").replace("www.yappy.im/api", "api.yappy.im") + '^600' : null,
                buttons: [{
                    title: "Reply",
                    iconUrl: "/images/reply.png"
                }]
            };

            if (options.imageUrl != null) {
                options.buttons.push({
                    title: "View full-size image",
                    iconUrl: "/images/picture.png"
                });
            }

            var listeners = {
                onButtonClicked: function(btnIdx) {
                    $.post(apiHost + '/chrome/SetRead', {
                        'DeviceID': message.DeviceID,
                        'Contact': message.PhoneRaw
                    });
                    if (btnIdx == 0) {
                        openEJWindow(true, '#Messages/' + message.PhoneRaw);
                    } else {
                        chrome.windows.create({
                            focused: true,
                            url: message.Image
                        });
                    }
                },
                onClicked: function() {
                    $.post(apiHost + '/chrome/SetRead', {
                        'DeviceID': message.DeviceID,
                        'Contact': message.PhoneRaw
                    });
                    console.log('Clicked: "message-body"');
                    openEJWindow(true, '#Messages/' + message.PhoneRaw);
                },
                onClosed: function(byUser) {

                    if (byUser) {
                        $.post(apiHost + '/chrome/SetRead', {
                            'DeviceID': message.DeviceID,
                            'Contact': message.PhoneRaw
                        });
                    }

                    console.log('Closed: ' + (byUser ? 'by user' : 'automagically (!?)'));
                }
            };

            /* Create the notification */
            createNotification(options, listeners, undefined, timerTimout);

        });
    };

	chatHub.client.addAndroidNotification = function(notification) {
	   var keys = [ "HideAndroid", "Timeout"];
        chrome.storage.local.get(keys, function(result) {

		   if (result["HideAndroid"] == true) {
				return;
		   }

		   var index = notifications.indexOf(notification.Key);
		   if (index > -1) {
		     
			 destroyNotification(notification.Key);
			 notifications.splice(notifications.indexOf(notification.Key), 1);
		   }
		   
		    var timerTimout = 5000;
            if (result["Timeout"] != null) {
                timerTimout = result["Timeout"];
            };
		   
		    var listeners = {
                onButtonClicked: function(btnIdx) {
                   if (btnIdx == 0) {                       
					    $.post(apiHost + '/chrome/NotificationDismiss', {
                        'Key': notification.Key,
						'DeviceID': notification.DeviceID
                    });				
					
					}
					else if (btnIdx == 1) {                       
					    $.post(apiHost + '/chrome/NotificationMute', {
                        'Package': notification.Package,
						'DeviceID': notification.DeviceID
                    });					
					notifications.splice(notifications.indexOf(notification.Key), 1);
					}			
                },
                onClicked: function() {
				
				if(notification.URL != null)
				{
					openEJWindow(true, null, notification.URL);
				}
				
                    console.log('Clicked: "message-body"');					
					notifications.splice(notifications.indexOf(notification.Key), 1);
                },
                onClosed: function(byUser) {
                    console.log('Closed: ' + (byUser ? 'by user' : 'automagically (!?)'));
					notifications.splice(notifications.indexOf(notification.Key), 1);
                }
            };
		
		    var myNotificationID = null;
            var options = {
                type: "basic",
                title: notification.Title,
                priority: 2,
                message: notification.Body,
			    iconUrl: "/images/icon_80.png",
                buttons: [{
                    title: "Dismiss",
                    iconUrl: "/images/close.png"
                },
				{
                    title: "Mute " + notification.App,
                    iconUrl: "/images/mute.png"
                }
				]
            };			

			notifications.push(notification.Key);
			
			/* Create the notification */
            createNotification(options, listeners, notification.Key, timerTimout);
		  });
	}

	chatHub.client.dismissAndroidNotification = function(messageKey) {
		console.log("Remove " + messageKey);
		destroyNotification(messageKey);
		
		if(notifications.indexOf(messageKey) > -1)
		{
			notifications.splice(notifications.indexOf(messageKey), 1);
		}
	}
	
	chatHub.client.echo = function () {
        clearTimeout(reconnectTimeout);
    };
					
    /* Create a notification and store references
     * of its "re-spawn" timer and event-listeners */
    function createNotification(details, listeners, notifId, timeout) {
        (notifId !== undefined) || (notifId = "");

        chrome.notifications.create(notifId, details, function(id) {
            if (timeout != null) {
                setTimeout(function() {
                    console.log('Timer destroying notification "' + id + '"...');
                    destroyNotification(id, function(wasCleared) {});
                }, timeout)
            }

            console.log('Created notification "' + id + '" !');
            if (pendingNotifications[id] !== undefined) {
                clearTimeout(pendingNotifications[id].timer);
            }

            pendingNotifications[id] = {
                listeners: listeners,
                timer: setTimeout(function() {
                    console.log('Re-spawning notification "' + id + '"...');
                    destroyNotification(id, function(wasCleared) {
                        if (wasCleared) {
                            createNotification(details, listeners, id);
                        }
                    });
                }, 25000)
            };
        });
    }

    /* Completely remove a notification, cancelling its "re-spawn" timer (if any)
     * Optionally, supply it with a callback to execute upon successful removal */
    function destroyNotification(notifId, callback) {

        /* Cancel the "re-spawn" timer (if any) */
        if (pendingNotifications[notifId] !== undefined) {
            clearTimeout(pendingNotifications[notifId].timer);
            delete(pendingNotifications[notifId]);
        }

        /* Remove the notification itself */
        chrome.notifications.clear(notifId, function(wasCleared) {
            console.log('Destroyed notification "' + notifId + '" !');

            /* Execute the callback (if any) */
            callback && callback(wasCleared);
        });
    }

    /* Respond to the user's clicking one of the buttons */
    chrome.notifications.onButtonClicked.addListener(function(notifId, btnIdx) {
        if (pendingNotifications[notifId] !== undefined) {
            var handler = pendingNotifications[notifId].listeners.onButtonClicked;
            destroyNotification(notifId, handler(btnIdx));
        }
    });

    /* Respond to the user's clicking on the notification message-body */
    chrome.notifications.onClicked.addListener(function(notifId) {
        if (pendingNotifications[notifId] !== undefined) {
            var handler = pendingNotifications[notifId].listeners.onClicked;
            destroyNotification(notifId, handler());
        }
    });

    /* Respond to the user's clicking on the small 'x' in the top right corner */
    chrome.notifications.onClosed.addListener(function(notifId, byUser) {
        if (pendingNotifications[notifId] !== undefined) {
            var handler = pendingNotifications[notifId].listeners.onClosed;
            destroyNotification(notifId, handler(byUser));
        }
    });

	var connectionFunction = function () {
		console.log('Attempting to connect');
	
	    // Start the connection.
		$.connection.hub.start()
		.done(function() {
			isConnected = true;
			isReconnecting = false;
			console.log('Connected to server');
		})
		.fail(function(){ 
			console.log('Connection failed, will retry');
			
			setTimeout(function() {
				  console.log('Reconnecting to server');
				  isReconnecting = true;
				  $.connection.hub.start();
			}, 2000); // Restart connection after 2 seconds.
		});
	};
	
	$.connection.hub.reconnecting(function() {
		console.log('Reconnecting to server');
		isReconnecting = true;
	});

	$.connection.hub.reconnected(function() {
		isConnected = true;
		isReconnecting = false;
        console.log('Re-connected to server');
	});

    $.connection.hub.disconnected(function() {
        console.log('Disconnected from server');
		 if ($.connection.hub.lastError) 
		 {   
			console.log('reason: ' + $.connection.hub.lastError.message);
		 }
		 	 
        setTimeout(function() {
            console.log('Reconnecting to server');
			  isReconnecting = true;
              connectionFunction();
        }, 2000); // Restart connection after 2 seconds.
    });
	
	//Connect to server
	connectionFunction();
	
	echoInterval = setInterval(function() {	
		reconnectTimeout = setTimeout(		
			function() {
				if(isReconnecting || !isConnected)
				{
					return;
				}		
				
				isReconnecting = true;
				console.log('Re-initating connection, havent heard echo');
				$.connection.hub.stop();	
				}
			, 5000);		
			
		//Ask server to echo to make sure we are still connected
		chatHub.server.echo();			
        }, 1000*60); // Echo every min
}


var fetchImage = function(url, done) {
    if (url.substring(0, 4) == 'data') {
        done(base64ToBlob(url.split(',')[1], url.split(';')[0].split(':')[1]));
    } else {
        var xhr = new XMLHttpRequest();
            xhr.open('GET', url);
            xhr.responseType = 'blob';
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4 && xhr.status === 200) {
                    done(xhr.response);
                }
            };
            xhr.send();
    }
};

base64ToBlob = function(base64Data, type) {
    var sliceSize = 1024;
    var byteCharacters = atob(base64Data);
    var bytesLength = byteCharacters.length;
    var slicesCount = Math.ceil(bytesLength / sliceSize);
    var byteArrays = new Array(slicesCount);

    for (var sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
        var begin = sliceIndex * sliceSize;
        var end = Math.min(begin + sliceSize, bytesLength);

        var bytes = new Array(end - begin);
        for (var offset = begin, i = 0 ; offset < end; ++i, ++offset) {
            bytes[i] = byteCharacters[offset].charCodeAt(0);
        }
        byteArrays[sliceIndex] = new Uint8Array(bytes);
    }

    return new Blob(byteArrays, { type: type });
};

imageNameFromUrl = function(url) {
    if (url.substring(0, 4) == 'data') {
        var type = url.split(';')[0].split(':')[1];
        var now = new Date();
        return 'Image_' + now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate()
               + '-' + now.getHours() + '-' + now.getMinutes() + '-' + now.getSeconds() + '.' + type.split('/')[1];
    } else {
        return url.split('/').pop().split('?')[0].split(':')[0];
    }
};
