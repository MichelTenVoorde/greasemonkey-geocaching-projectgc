// ==UserScript==
// @name        Geocaching.com + Project-GC
// @namespace   PGC
// @description Adds links and data to Geocaching.com to make it collaborate with PGC
// @include     http://www.geocaching.com/*
// @include     https://www.geocaching.com/*
// @version     1
// @require		http://ajax.googleapis.com/ajax/libs/jquery/1.11.0/jquery.min.js
// @grant		GM_xmlhttpRequest
// @grant		GM_setValue
// @grant		GM_getValue
// ==/UserScript==



// Global variables


// pgcUrl = 'http://project-gc.com/';
pgcUrl = 'http://g.gc.1447.se/';
pgcApiUrl = pgcUrl + 'api/gm/v1/';
externalLinkIcon = 'http://maxcdn.project-gc.com/images/external_small.png';
loggedIn = GM_getValue('loggedIn');
subscription = GM_getValue('subscription');
pgcUsername = GM_getValue('pgcUsername');
gccomUsername = GM_getValue('gccomUsername');
// -Global variables



// Don't run the script for iframes
if(window.top == window.self) {
	Main();
}

function Main() {

	// Always
	CheckPGCLogin();

	// Router
	var path = window.location.pathname;
	if(path.match(/^\/geocache\/.*/) != null) {
		CachePage();
	} else if(path.match(/^\/seek\/cache_logbook\.aspx.*/) != null) {
		Logbook();
	}
}

// Check that we are logged in at PGC, and that it's with the same username
function CheckPGCLogin() {
	var gccomUsername = $('#ctl00_divSignedIn .li-user-info span').html();

	GM_xmlhttpRequest({
		method: "GET",
		url: pgcApiUrl + 'GetMyUsername',
		onload: function(response) {
			var ret = JSON.parse(response.responseText);

			pgcUsername = ret['data']['username'];
			loggedIn = ret['data']['loggedIn'];
			subscription = ret['data']['subscription'];

			var html = '<a href="' + pgcUrl + '"><img width="50" height="20" src="http://maxcdn.project-gc.com/images/logo_gc_4.png" title="Project-GC"></a> ';


			if(loggedIn === false) {
				html = html + 'Not logged in';
			} else if(pgcUsername == gccomUsername) {
				html = html + '<strong>' + pgcUsername + '</strong>';
			} else {
				html = html + '<strong><font color="red">' + pgcUsername + '</font></strong>';
			}

			if(subscription) {
				html = html + '<img height=10 width=10 src="http://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Golden_star.svg/120px-Golden_star.svg.png"</a>';
			}


			if($('#ctl00_divSignedIn ul')) {
				$('#ctl00_divSignedIn ul').append('<li>' + html + '</li>');
			} else {
				$('#ctl00_divNotSignedIn').append('<div>' + html + '</div>');	// FIXME - Not working
			}



			// Save the login value
			GM_setValue('loggedIn', loggedIn);
			GM_setValue('subscription', subscription);
			GM_setValue('pgcUsername', pgcUsername);
		}
	});

	GM_setValue('gccomUsername', gccomUsername);
}

function getGcCodeFromPage()
{
	var gccode = $('#ctl00_ContentBody_CoordInfoLinkControl1_uxCoordInfoCode').html();
	return gccode;
}

function addToVGPS()
{
	var gccode = GM_getValue('gccode');
    listId = $('#comboVGPS').val();
    url = pgcApiUrl + 'AddToVGPSList?listId='+listId+'&gccode='+gccode+'&sectionName=GM-script';
	GM_xmlhttpRequest({
		method: "GET",
		url: url,
		onload: function(response) {
		    alert(response.responseText);

			var ret = JSON.parse(response.responseText);
		}
	});
}

function CachePage() {
	var gccode = getGcCodeFromPage();
	GM_setValue('gccode', gccode);
	latestLogs = [];

	// Append link to Profile Stats after the cache owners name
	var cacheOwnerDiv = $('#ctl00_ContentBody_mcd1');
	var placedBy = $('#ctl00_ContentBody_mcd1 a').html();
	cacheOwnerDiv.append('<a href="'+pgcUrl+'ProfileStats/' + encodeURIComponent(placedBy) + '"><img src="' + externalLinkIcon + '" title="PGC Profile Stats"></a>');

	// Append links to Profile Stats for every geocacher who has logged the cache as well
	// Though this is ajax, so we need some magic
	waitForKeyElements('#cache_logs_table tr', CachePage_Logbook);



	// Get cache data from PGC
	if(subscription) {
		GM_xmlhttpRequest({
			method: "GET",
			url: pgcApiUrl + 'GetCacheDataFromGccode?gccode=' + gccode,
			onload: function(response) {
				var ret = JSON.parse(response.responseText);
				var cacheData = ret['data'];

				// Add FP/FP%/FPW below the current FP
				var fp = parseInt(cacheData['favorite_points']);
				var fpp = parseInt(cacheData['favorite_points_pct']);
				var fpw = parseInt(cacheData['favorite_points_wilson']);

				$('#ctl00_divContentMain div.span-17 div.span-6.right.last div.favorite.right').append('<p>(' + fp + ' FP, ' + fpp + '%, ' + fpw + 'W)</p>');


				// Add PGC location
				var location = []
				if(cacheData['country'].length > 0) {
					location.push(cacheData['country']);
				}
				if(cacheData['region'].length > 0) {
					location.push(cacheData['region']);
				}
				if(cacheData['county'].length > 0) {
					location.push(cacheData['county']);
				}
				location = location.join(' / ');
				$('#ctl00_ContentBody_CacheInformationTable div.LocationData div.span-7').append('<span>' + location + '</span>');
			}
		});
	}



	// Make it easier to copy the gccode
	$('#ctl00_ContentBody_CoordInfoLinkControl1_uxCoordInfoLinkPanel').html('<div style="; margin-right: 15px; margin-bottom: 10px"><p style="font-size: 125%; margin-bottom: 0px">' + gccode + '</p><input size="30" type="text" value="http://coord.info/' + gccode + '" onClick="this.setSelectionRange(0, this.value.length)"><br></div>');


	// Remove the UTM coordinates
	// $('#ctl00_ContentBody_CacheInformationTable div.LocationData div.span-9 p.NoBottomSpacing br').remove();
	$('#ctl00_ContentBody_LocationSubPanel').remove();

	// Remove ads
	// PGC can't really do this officially
	// $('#ctl00_ContentBody_uxBanManWidget').remove();

	// Remove disclaimer
	// PGC can't really do this officially
	// $('#ctl00_divContentMain div.span-17 div.Note.Disclaimer').remove();

	// Hide download links
	$('<p style="cursor: pointer;" onclick="$(\'#ctl00_divContentMain div.DownloadLinks\').toggle();"><span class="arrow">▼</span>Print and Downloads</p>').insertAfter('#ctl00_ContentBody_CacheInformationTable div.LocationData');
	$('#ctl00_divContentMain div.DownloadLinks').hide();


	// Turn the coordinates into an address
	var coordinates = $('#ctl00_ContentBody_lnkConversions').attr('href');
	var latitude = coordinates.replace(/.*lat=([^&]*)&lon=.*/, "$1");
	var longitude = coordinates.replace(/.*&lon=([^&]*)&.*/, "$1");
	var url = 'http://maps.googleapis.com/maps/api/geocode/json?latlng=' + latitude + ',' + longitude + '&sensor=false';
	GM_xmlhttpRequest({
		method: "GET",
		url: url,
		onload: function(response) {
			var ret = JSON.parse(response.responseText);
			var formattedAddress = ret['results'][0]['formatted_address'];
			$('<br><span>' + formattedAddress + '</span>').insertAfter('#uxLatLonLink');
		}
	});


	// Add number of finds to the top
	// $('#ctl00_ContentBody_lblFindCounts').find('img').each(function() {
	// 	if($(this).attr('src') == '/images/logtypes/2.png') {	// Found
	// 	}
	// });
	$('#cacheDetails').append('<div>' + $('#ctl00_ContentBody_lblFindCounts').html() + '</div>');


	// Add link to PGC gallery
	if(subscription) {
		var html = '<a href="' + pgcUrl + 'Tools/Gallery?gccode=' + gccode + '&submit=Filter"><img src="' + externalLinkIcon + '" title="Project-GC"></a> ';
		$('.CacheDetailNavigation ul li:first').append(html);
	}



	var gccomUsername = GM_getValue('gccomUsername');
	var mapUrl = pgcUrl+'Maps/mapcompare/?profile_name=' + gccomUsername +
	'&nonefound=on&ownfound=on&location=' + latitude + ',' + longitude +
	'&max_distance=5&submit=Filter';

	$('#ctl00_ContentBody_CoordInfoLinkControl1_uxCoordInfoLinkPanel').append(
		'<a target="_blank" href="' + mapUrl + '&onefound=on">View on Project-GC</a>');

	$('#ctl00_ContentBody_CoordInfoLinkControl1_uxCoordInfoLinkPanel').append(
		' <a target="_blank" href="' + mapUrl + '">(not found)</a>');

	GM_xmlhttpRequest({
		method: "GET",
		url: pgcApiUrl + 'GetExistingVGPSLists',
		onload: function(response) {
			var ret = JSON.parse(response.responseText);
			var vgpsLists = ret['data']['lists'];
			var selected = ret['data']['selected'];

        	var html = '<li> <img width=16 height=16 src="http://maxcdn.project-gc.com/images/mobile_telephone_32.png"> Add to V-GPS <br>';
        	html = html + '<select id="comboVGPS">';
			for (var listId in vgpsLists) {
				var list = vgpsLists[listId];
				var listName = list.name;

				if(selected == listId) {
	            	html = html + '<option value="' + listId + '" selected="selected">' + listName + '</option>';
	            } else {
	            	html = html + '<option value="' + listId + '">' + listName + '</option>';
	            }
            }
        	html = html + '</select>';
        	html = html + '<button id="btnaddToVGPS">+</button>';
        	html = html + '</li>'

        	$('div.CacheDetailNavigation ul:first').append(html);


        	$('#btnaddToVGPS').click(function(event)
        	{
        	   event.preventDefault();
        	   addToVGPS();
        	});
		}
	});
}

function CachePage_Logbook(jNode) {
	// Add Profile stats link after each user
	var profileName = $(jNode).find('p.logOwnerProfileName strong a').html();
	if(profileName != null) {
		var profileName = $(jNode).find('p.logOwnerProfileName strong a').append('<a href="'+pgcUrl+'ProfileStats/' + encodeURIComponent(profileName) + '"><img src="' + externalLinkIcon + '" title="PGC Profile Stats"></a>');
	}

	// Save to latest logs
	if(latestLogs.length < 5) {
		var logType = $(jNode).find('div.LogType strong img').attr('src');
		if(logType == '/images/logtypes/3.png') {	// dnf
			latestLogs.push('<img src="' + logType + '">');
		} else if(logType == '/images/logtypes/2.png') {	// found
			latestLogs.push('<img src="' + logType + '">');
		}

		// Show them
		if(latestLogs.length == 5) {
			var images = latestLogs.join('');
			// $('#ctl00_ContentBody_diffTerr').append('<dl><dt> Latest logs:</dt><dd><span>' + images + '</span></dd></dl>');
			$('#ctl00_ContentBody_size p').addClass('NoBottomSpacing');
			$('#ctl00_ContentBody_size').append('<p class="AlignCenter NoBottomSpacing">Latest logs:<span>' + images + '</span></p>');

		}
	}
}


function Logbook() {
	waitForKeyElements('#AllLogs tr', CachePage_Logbook);
}

function Logbook_Logbook(jNode) {
	CachePage_Logbook(jNode);
}


/*--- waitForKeyElements():  A utility function, for Greasemonkey scripts,
    that detects and handles AJAXed content.

    Usage example:

        waitForKeyElements (
            "div.comments"
            , commentCallbackFunction
        );

        //--- Page-specific function to do what we want when the node is found.
        function commentCallbackFunction (jNode) {
            jNode.text ("This comment changed by waitForKeyElements().");
        }

    IMPORTANT: This function requires your script to have loaded jQuery.
*/
function waitForKeyElements (
    selectorTxt,    /* Required: The jQuery selector string that
                        specifies the desired element(s).
                    */
    actionFunction, /* Required: The code to run when elements are
                        found. It is passed a jNode to the matched
                        element.
                    */
    bWaitOnce,      /* Optional: If false, will continue to scan for
                        new elements even after the first match is
                        found.
                    */
    iframeSelector  /* Optional: If set, identifies the iframe to
                        search.
                    */
) {
    var targetNodes, btargetsFound;

    if (typeof iframeSelector == "undefined")
        targetNodes     = $(selectorTxt);
    else
        targetNodes     = $(iframeSelector).contents ()
                                           .find (selectorTxt);

    if (targetNodes  &&  targetNodes.length > 0) {
        btargetsFound   = true;
        /*--- Found target node(s).  Go through each and act if they
            are new.
        */
        targetNodes.each ( function () {
            var jThis        = $(this);
            var alreadyFound = jThis.data ('alreadyFound')  ||  false;

            if (!alreadyFound) {
                //--- Call the payload function.
                var cancelFound     = actionFunction (jThis);
                if (cancelFound)
                    btargetsFound   = false;
                else
                    jThis.data ('alreadyFound', true);
            }
        } );
    }
    else {
        btargetsFound   = false;
    }

    //--- Get the timer-control variable for this selector.
    var controlObj      = waitForKeyElements.controlObj  ||  {};
    var controlKey      = selectorTxt.replace (/[^\w]/g, "_");
    var timeControl     = controlObj [controlKey];

    //--- Now set or clear the timer as appropriate.
    if (btargetsFound  &&  bWaitOnce  &&  timeControl) {
        //--- The only condition where we need to clear the timer.
        clearInterval (timeControl);
        delete controlObj [controlKey]
    }
    else {
        //--- Set a timer, if needed.
        if ( ! timeControl) {
            timeControl = setInterval ( function () {
                    waitForKeyElements (    selectorTxt,
                                            actionFunction,
                                            bWaitOnce,
                                            iframeSelector
                                        );
                },
                300
            );
            controlObj [controlKey] = timeControl;
        }
    }
    waitForKeyElements.controlObj   = controlObj;
}
