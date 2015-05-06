function openEJWindow(newWindow, subUrl, URL)
{
    var newURL = "https://www.yappy.im/web/";
    var isOpen = false;
	if(subUrl == null)
	{
		subUrl = "";
	}
	
	if (URL!= null)
	{
		newURL = URL;
	}
	

    // get the current window
    chrome.windows.getAll({
        populate: true
    }, function (windows) {
        var windowsLeft = windows.length;

        for (var w = 0; w < windows.length; w++) {
            // get an array of the tabs in the window
            var myWindow = windows[w];
            chrome.tabs.getAllInWindow(windows[w].id, function (tabs) {
                for (var i = 0; i < tabs.length; i++) {
                    if (tabs[i].url.toString().indexOf(newURL) > -1) {  
                        var myTab = tabs[i];
                        isOpen = true;
                        windowsLeft += 1;
                        chrome.tabs.update(myTab.id, { highlighted: true, url: (newURL + subUrl)});     
                        chrome.windows.update(myWindow.id, {                           
                            focused: true,
                            state: myWindow.state == "minimized" ? "normal" : myWindow.state
                        }, function () { windowsLeft -= 1;});
                    }

                    if (i == tabs.length - 1) {
                        windowsLeft -= 1;
                    }
                }
            });
        }

        var interval = setInterval(function () {
            if (windowsLeft == 0) {
                clearInterval(interval);

                if (isOpen == false) {
                    if (newWindow == true) {
                        chrome.windows.create({
                            type: 'popup',
                            focused: true,
							url: newURL + subUrl,
                            height: 600,
                            width: 1100
                        });
                    } else {
                        chrome.tabs.create({
                            url: newURL
                        });
                    }
                }
            }
        }, 50);
    });
}