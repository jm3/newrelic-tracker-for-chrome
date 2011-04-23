/* by John Manoogian III / jm3 */
var api_endpoint = "https://rpm.newrelic.com/";
var danger_threshold = 0.8;
var ga_account_id = 'UA-228926-7';
var groundhog_seconds = 60;

function fetch_app_summary_stats( newrelic_api_key, callback ) {
  if( newrelic_api_key ) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() { callback(xhr) };
    xhr.open("GET", api_endpoint + "accounts.xml?include=application_health", true);
    xhr.setRequestHeader("x-api-key", newrelic_api_key);
    xhr.send();
  } else {
    $("#note").css("border", "5px solid red;");
    $("#note").replaceWith("<h1>First, enter your NewRelic API key.</h1>");
  }
}

function process_summary_metrics( xhr ) {
  if( xhr.readyState != 4 ) return;
  if( xhr.status != 200 ) { console.log( "error! - " + xhr.status ); return; }
  var newrelic_primary_app = localStorage["newrelic_primary_app"];

  var apdex = 
    $(xhr.responseXML).
    find( "id:contains(" + newrelic_primary_app + ")" ).
    parent().
    find( "threshold_value[name='Apdex']" ).
    attr( "metric_value" );

  if( isNaN( apdex ))
    return;

  chrome.browserAction.setBadgeText( {text:apdex} );
  console.log( apdex );

  /* RGBA order */
  var color, apdex_colors = {
    safe:     [0,  155,    0,  255],
    middling: [0,    0,  255,  225],
    danger:   [255,  0,  0,    255]
  };

  if( parseFloat( apdex ) < danger_threshold )
    color = {color:apdex_colors.danger};
  else
    color = {color:apdex_colors.safe};
  chrome.browserAction.setBadgeBackgroundColor( color );
}

function display_all_app_stats( newrelic_api_key ) {
  if( newrelic_api_key ) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function( x ) {
      if( xhr.readyState != 4 ) return;
      if( xhr.status != 200 ) { console.log( "error! - " + xhr.status ); return; }
      $("#hud").empty();
      $("#hud").append( xhr.responseText );
    }
    xhr.open("GET", api_endpoint + "application_dashboard", true);
    xhr.setRequestHeader("x-api-key", newrelic_api_key);
    xhr.send();
  } else {
    $("#note").css("border", "5px solid red;");
    $("#note").replaceWith("<h1>First, enter your NewRelic API key.</h1>");
  }
}

function persist_field( f ) {
  var val = $("#" + f).val();
  if( val && val != localStorage[f] ) {
    localStorage[f] = val;
    console.log( "display feedback that " + val + " was saved successfully to " + f + " in local storage" ); // FIXME
  }
}

function persist_select( s ) {
  var val = $('#' + s + ' option:selected').val();
  if( val && val != localStorage[s] ) {
    console.log( "menu was: " + $('#' + s + ' option:selected').val());
    localStorage[s] = val;
    console.log( "display feedback that " + val + " was saved successfully to " + s + " local storage" ); // FIXME
  }
}

function save_options() {
  persist_field( "newrelic_api_key" )
  persist_select( "newrelic_primary_app" )
}

function parse_apps_and_populate_pulldown( xhr ) {
  // reset the picker UPI in case of AJAX fail
  $("#newrelic_primary_app_ui" ).css( "display", "none" );
  if( xhr.readyState != 4 ) return;
  if( xhr.status != 200 || (! xhr.responseXML) ) { console.log( "error! - " + xhr.status ); return; }

  var apps = $(xhr.responseXML).find( "accounts account applications application" );

  //if( apps.size() < 1 )

  // FIXME: check localstorage and reset iff nec.
  if( apps.size() == 1 )
    return;

  var index_set = false;
  for( var i = 0; i < apps.length; i++ ) {
    var name = $(apps[i]).find( "name" ).text();
    var id = $(apps[i]).find( "id" ).text();
    $("#newrelic_primary_app" ).append( "<option value='" + id + "'>" + name + "</option>" );
    if( localStorage["newrelic_primary_app"] == id ) {
      $("#newrelic_primary_app" ).val( id );
      index_set = true;
    }
  }

  // since we couldn't find a match, the user's previously saved primary 
  // app has been deleted or renamed, so default to the first app.

  if( ! index_set )
    localStorage["newrelic_primary_app"] = $(apps[0]).find( "id" ).text();

  $("#newrelic_primary_app_ui" ).css( "display", "block" );
}

function restore_options() {
  var newrelic_api_key = localStorage["newrelic_api_key"];
  if( ! newrelic_api_key )
    return;
  $("#newrelic_api_key").val( newrelic_api_key );

  fetch_app_summary_stats( newrelic_api_key, parse_apps_and_populate_pulldown );
}

function track_using_GA( account_id ) {
  if( !account_id )
    return;
  /* GA tracking */
  var _gaq = _gaq || [];
  _gaq.push(['_setAccount', account_id]);
  _gaq.push(['_setCampNameKey',   'version-1']);
  _gaq.push(['_setCampMediumKey', 'google-chrome']);
  _gaq.push(['_setCampSourceKey', 'chrome-relic-extension']);
  _gaq.push(['_trackPageview']);

  (function() {
    var ga = document.createElement('script');
    ga.type = 'text/javascript';
    ga.async = true;
    ga.src = 'https://ssl.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(ga, s);
  })();
}

