function SaveLoggedIn(state) {
    // Save it using the Chrome extension storage API.
    chrome.storage.sync.set({
        'LoggedIn': state
    }, function () {

    });
}

function GetLoggedIn(callback) {
    chrome.storage.sync.get(mykey, function (result) {
        callback(result)
    })
}

