/* by John Manoogian III / jm3 */

var DEBUG = true;

var HOPTOAD = {
  account_name: function() {
    return localStorage["hoptoad_account_name"];
  },

  auth_token: function() {
    return localStorage["hoptoad_auth_token"];
  },

  api_endpoint: "https://ACCOUNT_NAME.hoptoadapp.com/",
  
  response_slots: [ "id", "project-id", "created-at", "action", "error-class", "error-message", "file", "rails-env", "line-number", "most-recent-notice-at", "notices-count" ],

  build_cache: function() {
    var c = localStorage["hoptoad_cache"];
    if( !c ) {
      return new Array();
    } else {
      return c.split( " " );
    }
  },

  check_for_new_errors: function() {
    var ht = new Object();
    
    if( !this.account_name() || !this.auth_token() )
      return;
    var errors_url = this.api_endpoint.replace( /ACCOUNT_NAME/, this.account_name()) +
      ("/errors.xml?auth_token=TOK").replace( /TOK/, this.auth_token() );
    
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() { HOPTOAD.display_new_errors(xhr) };
    xhr.open("GET", errors_url, true);
    xhr.send();
  },

  seen_error: function( id ) {
    var hoptoad_cache = hoptoad_cache || this.build_cache();
    if( $.inArray( id, hoptoad_cache ) != -1 )
      return id;
    else {
      hoptoad_cache.push( id );
      localStorage["hoptoad_cache"] = hoptoad_cache.join(' ');
      return;
    }
  },

  display_new_errors: function( xhr ) {
    if( xhr.readyState != 4 ) return;
    if( xhr.status != 200 ) { c( "error! - " + xhr.status ); return; } // FIXME: handle / bubble up error
    
    var errors = $(xhr.responseXML).find( "groups" ).find( "group" );
    var errors_skipped = 0; 
    $.each( errors, function( i, error ) {
      if( !HOPTOAD.seen_error( $(error).find( "id" ).text()))
        HOPTOAD.display_error( error );
      else
        errors_skipped = i;
    });
      c( "Skipped " + errors_skipped + " previously seen Hoptoad errors." );
  },

  display_error: function( e ) {
    var e = $(e);
    
    var link_to_error = 
      this.api_endpoint.replace( /ACCOUNT_NAME/, this.account_name() )
      + "errors/" + e.find( "id" ).text();
    var qs = "link=" + escape( link_to_error);
    
    // marshall the good bits from the XHR response object to query string
    $.each( this.response_slots, function(i,v) { qs += "&" + v + "=" + escape( e.find( v ).text() )});
    webkitNotifications.createHTMLNotification( "/screens/notification.html?" + qs ).show();
  },

  render_error: function() {
    var mesg = get_param( "error-message" );
    if( mesg ) // add spacing so HTML can wrap the errors properly
      mesg = mesg.replace(/::/g, ":: ").replace(/(\w)\/(\w)/g, "$1/ $2").replace(/(\w)Error/g, "$1 Error");
    var link = get_param( "link" );
    $("#notification").append( "<a href='" + link + "' target='hoptoad'>" + mesg + "</a>");
    /*
    * fields avail: 
    * "id", "project-id", "created-at", "action", "error-class", "error-message", "file", "rails-env", "line-number", "most-recent-notice-at", "notices-count" ];
    * var error_markup = ""
    * $.each( this.response_slots, function(i,v) { error_markup += "<dt>" + v + "</dt><dd>" + get_param(v) + "</dd>" });
    * $("#notification").append( "<dl>" + error_markup + "</dl>" );
    */
  },

  fetch_app_list: function( callback ) {
    // TODO: http://your_account.hoptoadapp.com/data_api/v1/projects.xml
  },

  END: undefined
};

var NEWRELIC = {

  api_endpoint: "https://rpm.newrelic.com/",

  danger_threshold: 0.8,

  api_key: function() {
    return localStorage["newrelic_api_key"];
  },

  primary_app: function() {
    return localStorage["newrelic_primary_app"];
  },

  parse_apps_and_populate_pulldown: function( xhr ) {
    // reset the picker UPI in case of AJAX fail
    $("#newrelic_primary_app" ).attr( "disabled", "true" );
    $("#newrelic_primary_app_ui label" ).addClass( "disabled" );
    if( xhr.readyState != 4 ) return;
    if( xhr.status != 200 || (! xhr.responseXML) ) { c( "error! - " + xhr.status ); return; } // FIXME handle error
    
    var apps = $(xhr.responseXML).find( "accounts account applications application" );
    
    if( apps.size() == 1 )
      return;
    
    var index_set = false;
    for( var i = 0; i < apps.length; i++ ) {
      var name = $(apps[i]).find( "name" ).text();
      var id = $(apps[i]).find( "id" ).text();
      $("#newrelic_primary_app" ).append( "<option value='" + id + "'>" + name + "</option>" );
      if( NEWRELIC.primary_app() == id ) {
        $("#newrelic_primary_app" ).val( id );
        index_set = true;
      }
    }
    
    // since we couldn't find a match, the user's previously saved primary 
    // app has been deleted or renamed, so default to the first app.
    if( ! index_set )
      localStorage["newrelic_primary_app"] = $(apps[0]).find( "id" ).text();
    
    $("#newrelic_primary_app" ).removeAttr( "disabled" );
    $("#newrelic_primary_app_ui label" ).removeClass( "disabled" );
  },

  fetch_and_display_app_stats: function( callback ) {
    if( ! this.api_key())
      return signal_error( "First, enter your NewRelic API key." );
    
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() { callback(xhr) };
    xhr.open("GET", this.api_endpoint + "accounts.xml?include=application_health", true);
    xhr.setRequestHeader("x-api-key", this.api_key());
    xhr.send();
  },

  display_all_app_stats: function() {
    if( ! this.api_key() )
      return signal_error( "First, enter your NewRelic API key." );
    
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function( x ) {
      if( xhr.readyState != 4 ) return;
      if( xhr.status != 200 ) { c( "error! - " + xhr.status ); return; }
      $("#hud").empty();
      $("#hud").append( xhr.responseText );
    }
    xhr.open("GET", this.api_endpoint + "application_dashboard", true);
    xhr.setRequestHeader("x-api-key", this.api_key());
    xhr.send();
  },

  process_stats: function( xhr ) {
    if( xhr.readyState != 4 ) return;
    if( xhr.status != 200 ) { c( "error! - " + xhr.status ); return; } // FIXME: handle / bubble up error

    var apdex = 
      $(xhr.responseXML).
      find( "id:contains(" + NEWRELIC.primary_app() + ")" ).
      parent().
      find( "threshold_value[name='Apdex']" ).
      attr( "metric_value" );

    if( isNaN( apdex ))
      return;

    chrome.browserAction.setBadgeText( {text:apdex} );

    /* RGBA order */
    var color, apdex_colors = {
      safe:     [0,  155,    0,  255],
      middling: [0,    0,  255,  225],
      danger:   [255,  0,  0,    255]
    };

    if( parseFloat( apdex ) < NEWRELIC.danger_threshold )
      color = {color:apdex_colors.danger};
    else
      color = {color:apdex_colors.safe};
    chrome.browserAction.setBadgeBackgroundColor( color );
  },

  END: undefined
};

function c( s ) {
  if( DEBUG )
    console.log( s );
}

function get_ga_account_id() {
  return 'UA-228926-7';
}

function signal_error( s ) {
  $("#note").replaceWith("<h1>" + s + "</h1>");
  c( s );
  $("#hud").hide();
  $("#welcome").show();
  return undefined;
}

function setup_ux() {
  if( !NEWRELIC.api_key()) {
    $("#hud").hide();
    $("#footer").hide();
    $("#welcome").show();
  } else {
    $("#hud").show();
    $("#footer").show();
    $("#welcome").hide();
  }
}

function persist_fields( a ) {
  while( f = a.shift() ) { persist_field( f ); }
}

function persist_field( f ) {
  var val = $("#" + f).val();
  if( val && val != localStorage[f] ) {
    localStorage[f] = val;
    c( "display feedback that " + val + " was saved successfully to " + f + " in local storage" ); // FIXME
  }
}

function persist_select( s ) {
  var val = $('#' + s + ' option:selected').val();
  if( val && val != localStorage[s] ) {
    c( "menu was: " + $('#' + s + ' option:selected').val());
    localStorage[s] = val;
    c( "display feedback that " + val + " was saved successfully to " + s + " local storage" ); // FIXME
  }
}

function save_options() {
  persist_fields( ["newrelic_api_key", "hoptoad_account_name", "hoptoad_auth_token"] );
  persist_select( "newrelic_primary_app" )
  window.close();
}

function restore_field( f ) {
  var val = localStorage[f];
  $("#" + f ).val( val );
  return val;
}

function restore_options() {
  if( restore_field( "newrelic_api_key" ))
    NEWRELIC.fetch_and_display_app_stats( NEWRELIC.parse_apps_and_populate_pulldown );
  restore_field( "hoptoad_account_name" );
  restore_field( "hoptoad_auth_token" );
}

function get_param(name) {
  var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
  return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
}

function m(m) {
  return chrome.i18n.getMessage(m);
}

function track_using_GA() {
  if( !( account_id = get_ga_account_id()))
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
