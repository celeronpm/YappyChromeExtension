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


function connect() {
    var chatHub = $.connection.chatHub;
    $.connection.hub.url = apiHost + "/signalr";
    var pendingNotifications = {};

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

    // Start the connection.
    $.connection.hub.start().done(function() {
        isConnected = true;
        console.log('Connected to server');
    });

    $.connection.hub.disconnected(function() {
        console.log('Disconnected from');
        setTimeout(function() {
            console.log('Reconnecting to server');
            $.connection.hub.start();
        }, 5000); // Restart connection after 5 seconds.
    });
}