/* -*- mode: javascript; tab-width: 8; indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */


// Page initialization
$(async () => {
  let prefs = await aePrefs.getAllPrefs();

  setSyncStatus(prefs.syncEnabled);

  $("#auto-delete-when-read").prop("checked", prefs.deleteReadLinks).on("click", aEvent => {
    aePrefs.setPrefs({deleteReadLinks: aEvent.target.checked});
  });
});


function setSyncStatus(aIsSyncEnabled)
{
  if (aIsSyncEnabled) {
    $("#sync-status").text("status: Connected 🟢");
    $("#toggle-sync").text("disconnect");
  }
  else {
    $("#sync-status").text("status: Disconnected ⚪️");
    $("#toggle-sync").text("connect");
  }
}


//
// Event handlers
//

$("#toggle-sync").on("click", async (aEvent) => {
  let syncPrefs = {
    syncEnabled: false,
    syncClient: null,
    accessToken: null,
  };
  let syncEnabled = await aePrefs.getPref("syncEnabled");

  if (syncEnabled) {
    let confirmTurnOff = window.confirm("disconnect from remote storage?");

    if (! confirmTurnOff) {
      return;
    }

    try {
      await browser.runtime.sendMessage({id: "sync-disconnected-from-ext-prefs"});
    }
    catch {}
  }
  else {
    let backend = window.prompt("backend to use (1=RemoteStorage, 2=Dropbox):", "2");
    if (! backend) {
      return;
    }

    if (backend == aeConst.RS_BACKEND_REMOTESTORAGE) {
      let rsUserAddress = window.prompt("remoteStorage user address:", "user@provider.com")
      if (! rsUserAddress) {
        return;
      }

      syncPrefs.syncEnabled = true;
      syncPrefs.syncClient = aeConst.RS_BACKEND_REMOTESTORAGE;
      syncPrefs.rsUserAddress = rsUserAddress;
      syncPrefs.initRSBackend = true;
      syncPrefs.syncEnabledFromExtPrefs = true;
      await aePrefs.setPrefs(syncPrefs);

      try {
        await browser.runtime.sendMessage({
          id: "sync-setting-changed",
          syncEnabled: syncPrefs.syncEnabled,
        });
      }
      catch {}

      setSyncStatus(syncPrefs.syncEnabled);
      return;
    }

    // Initialize Dropbox backend
    $(document.body).css({cursor: "progress"});
    $("#toggle-sync").attr("disabled", "true");

    aeOAuth.init(backend);
    let authzCode, accessToken;
    try {
      authzCode = await aeOAuth.getAuthorizationCode();
      log("remoteStorage Demo::options.js: Authorization code: " + authzCode);

      accessToken = await aeOAuth.getAccessToken();
      log("remoteStorage Demo::options.js: Received access token from authorization server: " + accessToken);
    }
    catch (e) {
      window.alert(e);
    }
    finally {
      $(document.body).css({cursor: "unset"});
      $("#toggle-sync").removeAttr("disabled");     
    }

    if (! accessToken) {
      return;
    }

    syncPrefs = {
      syncEnabled: true,
      syncClient: backend,
      accessToken,
      syncEnabledFromExtPrefs: true
    };
  }

  await aePrefs.setPrefs(syncPrefs);
  try {
    await browser.runtime.sendMessage({
      id: "sync-setting-changed",
      syncEnabled: syncPrefs.syncEnabled,
    });
  }
  catch {}
  
  setSyncStatus(syncPrefs.syncEnabled);
});


$(document).on("contextmenu", aEvent => {
  if (aEvent.target.tagName != "INPUT" && aEvent.target.getAttribute("type") != "text") {
    aEvent.preventDefault();
  }
});


function log(aMessage)
{
  if (aeConst.DEBUG) { console.log(aMessage) }
}
