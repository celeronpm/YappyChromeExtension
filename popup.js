var apiHost = 'https://api.yappy.im';
var sendTo = [];

function split(val) {
    return val.split(/,\s*/);
}

function extractLast(term) {
    return split(term).pop();
}

function getSendToList() {
    var recipients = split($("#txtPhone").val());
    var finalList = "";

    for (var i = 0; i < recipients.length; i++) {
        var item = recipients[i];

        var existsAt = -1;
        for (var x = 0; x < sendTo.length; x++) {
            if (sendTo[x].value == item) {
                item = sendTo[x].id;
            }
        }

        if (item.length >= 0 && item != "") {
            if (finalList != "") {
                finalList += "|";
            }

            finalList += item;
        }

    };
    return finalList;
}

var formatHelpers = {
    month: new Array("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"),
    timeToString: function (time, showTimeIfDateNotSame, showYear) {
        if (time == null) {
            return null;
        }

        var messageDate = new Date(0); // The 0 there is the key, which sets the date to the epoch
        messageDate.setUTCMilliseconds(time);
        
        var minutes = messageDate.getMinutes();
        if (minutes < 10) {
            minutes = "0" + minutes;
        }

        if (formatHelpers.isDameDay(messageDate, new Date)) {
            try {
                var t = messageDate.toLocaleTimeString(model.selectedDevice().selectedLocale());
                t = t.replace(/\u200E/g, '');
                t = t.replace(/^([^\d]*\d{1,2}:\d{1,2}):\d{1,2}([^\d]*)$/, '$1$2');
                return t + (showYear == true ? (" " + messageDate.getFullYear()) : "");
            }
            catch(e){}
            return (messageDate.getHours() > 12 ? messageDate.getHours() - 12 : messageDate.getHours() == 0 ? 12 : messageDate.getHours()) + ":" + minutes + " " + (messageDate.getHours() > 12 ? "PM" : "AM") + (showYear == true ? (" " + messageDate.getFullYear()) : "");
        } else {
            if (showTimeIfDateNotSame == true) {
                try {
                    var t = messageDate.toLocaleTimeString(model.selectedDevice().selectedLocale());
                    t = t.replace(/\u200E/g, '');
                    t = t.replace(/^([^\d]*\d{1,2}:\d{1,2}):\d{1,2}([^\d]*)$/, '$1$2');

                    return this.month[messageDate.getMonth()] + " " + messageDate.getDate() + " " + t + (showYear == true ? (" " + messageDate.getFullYear()) : "");
                }
                catch (e) { }
                return this.month[messageDate.getMonth()] + " " + messageDate.getDate() + " " + (messageDate.getHours() > 12 ? messageDate.getHours() - 12 : messageDate.getHours() == 0 ? 12 : messageDate.getHours()) + ":" + minutes + " " + (messageDate.getHours() > 12 ? "PM" : "AM") + (showYear == true ? (" " + messageDate.getFullYear()) : "");
            }
            return this.month[messageDate.getMonth()] + " " + messageDate.getDate() + (showYear == true ? (" " + messageDate.getFullYear()) : "");
        }
    },
    formatNumber: function(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    },
    isDameDay: function (d1, d2) {
        return d1.getFullYear() == d2.getFullYear() &&
            d1.getMonth() == d2.getMonth() &&
            d1.getDate() == d2.getDate();
    },
    formatSeconds: function (totalSeconds) {
        var hours = Math.floor(totalSeconds / 3600);
        totalSeconds %= 3600;
        var minutes = Math.floor(totalSeconds / 60);
        var seconds = totalSeconds % 60;

        if (totalSeconds == 0) {
            return "indeterminate";
        }

        return (hours > 0 ? hours + " hours, " : "") + (minutes > 0 ? minutes + " minutes, " : "") +( seconds +" seconds");
    }
};

$(document).ready(function() {

    $('ul.tabs').tabs();
    $('.dropdown-button').dropdown();

	$("#deviceList").change(function() {
		refreshUnread();
	});
	
	
    $.get(apiHost + '/Chrome/GetDevices')
        .success(function(data) {
            $.each(data, function(index, device) {

                if (device.Phone.length > 0) {
                    $("#btnSend").removeClass("disabled");
                    $('#deviceList')
                        .append($("<option></option>")
                            .attr("value", device.WebID)
                            .text(device.NickName + " - " + device.Phone));
                }
            });
			
			refreshUnread();
        });


	function refreshUnread()
	{
		$.post(apiHost + '/chrome/GetCountUnread', {
				'DeviceID': $('#deviceList option:selected').val()
			},
			function(data) {
				$("#UnreadMessages").text(data)
			});
			
			$.post(apiHost + '/chrome/GetBattery', {
				'DeviceID': $('#deviceList option:selected').val()
			},
			function(data) {
				$("#BatteryLevel").text((data.Percent * 100)+"% (" + (data.IsCharging ? "charging" : "discharging") +") - " + formatHelpers.timeToString(data.Time))
			});
	}

    $("#chkHideNotification").change(function(e) {
        var checked = $(this).is(":checked");
	
        chrome.storage.local.set({
            'HideNotification': checked
        });

        $("#chkHidePhone").parent().css("display", checked ? 'none' : 'block');
        $("#chkHideName").parent().css("display", checked ? 'none' : 'block');
        $("#chkHidePhoto").parent().css("display", checked ? 'none' : 'block');
        $("#chkHideMessage").parent().css("display", checked ? 'none' : 'block');
        $("#chkHideImages").parent().css("display", checked ? 'none' : 'block');
        $("#labelTimeout").css("display", checked ? 'none' : 'block');
        $("#timeoutDD").css("display", checked ? 'none' : 'block');

    });

	$("#chkHideAndroid").change(function(e) {
        var checked = $(this).is(":checked");
        chrome.storage.local.set({
            'HideAndroid': checked
        });
    });
	

    $("#chkHideImages").change(function(e) {
        var checked = $(this).is(":checked");
        chrome.storage.local.set({
            'HideImage': checked
        });
    });

    $("#chkHidePhone").change(function(e) {
        var checked = $(this).is(":checked");
        chrome.storage.local.set({
            'HidePhone': checked
        });
    });

    $("#chkHideName").change(function(e) {
        var checked = $(this).is(":checked");
        chrome.storage.local.set({
            'HideName': checked
        });
    });

    $("#chkHidePhoto").change(function(e) {
        var checked = $(this).is(":checked");
        chrome.storage.local.set({
            'HidePhoto': checked
        });
    });

    $("#chkHideMessage").change(function(e) {
        var checked = $(this).is(":checked");
        chrome.storage.local.set({
            'HideMessage': checked
        });
    });

    $("#selectTimeout").change(function(e) {
        chrome.storage.local.set({
            'Timeout': $(this).val()
        });
    });

    var keys = ["HideNotification", "HidePhone", "HideName", "HidePhoto", "HideMessage", "HideImage", "Timeout", "HideAndroid"];
    chrome.storage.local.get(keys, function(result) {

        if (result["HidePhone"] == true) {
            $("#chkHidePhone").attr('checked', 'checked');
        };

        if (result["HideName"] == true) {
            $("#chkHideName").attr('checked', 'checked');
        };

        if (result["HidePhoto"] == true) {
            $("#chkHidePhoto").attr('checked', 'checked');
        };

        if (result["HideMessage"] == true) {
            $("#chkHideMessage").attr('checked', 'checked');
        };

        if (result["Timeout"] != null) {
            $("#selectTimeout").val(result["Timeout"]);
            $("#timeoutDD").text(result["Timeout"]);
        };

        if (result["HideImage"] == true) {
            $("#chkHideImages").click();
        };

        if (result["HideNotification"] == true) {
            $("#chkHideNotification").click();
        };
		
		   if (result["HideAndroid"] == true) {
            $("#chkHideAndroid").click();
        };

    });

    $("#openEJ").click(function() {
        openEJWindow(true);
        setTimeout(function() {
            window.close();
        }, 100);

        return false;
    });

    $("#openEJTab").click(function() {
        openEJWindow(false);
        setTimeout(function() {
            window.close();
        }, 100);

        return false;
    });

    $("#btnSend").click(function() {

        var toPerson = getSendToList();
        var message = $('#txtMessage').val();
        var deviceID = $('#deviceList option:selected').val();

        if (toPerson.length == 0) {
            toast('Please enter a phone #', 2000);
            return;
        }

        if (message.length == 0) {
            toast('Please enter a message to send', 2000);
            return;
        }

        toast('Message on its way!', 2000);


        $.post(apiHost + '/chrome/SendMessage', {
                'DeviceID': deviceID,
                'Phone': toPerson,
                'Message': message
            })
            .done(function() {
                setTimeout(function() {
                    window.close();
                }, 2000);
            });

    });

    $("#txtPhone")
        .bind("keydown", function(event) {
            if (event.keyCode === $.ui.keyCode.TAB &&
                $(this).data("ui-autocomplete").menu.active) {
                event.preventDefault();
            }
        })
        .autocomplete({
            source: function(request, response) {
                $.post(apiHost + '/chrome/AutocompleteContact', {
                        'DeviceID': $('#deviceList option:selected').val(),
                        'Contact': extractLast(request.term)
                    })
                    .success(function(data) {
                        response($.map(data, function(item) {
                            return {
                                label: item.NameFull,
                                value: item.Name,
                                id: item.Phone
                            };
                        }));
                    });
            },
            search: function() {
                var term = extractLast(this.value);
                if (term.length < 1) {
                    return false;
                }
            },
            focus: function() {
                // prevent value inserted on focus
                return false;
            },
            select: function(event, selectedItem) {
                sendTo.push(selectedItem.item);

                var contacts = "";
                var value = "";

                for (var i = 0; i < sendTo.length; i++) {
                    var item = sendTo[i];
                    if (contacts != "") {
                        contacts += "|";
                        value += ", ";
                    }

                    contacts += item.id;
                    value += item.value;
                };
                value += ", ";
                this.value = value;

                return false;
            }
        });
});