/* -*- mode: javascript; tab-width: 8; indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const RS_LOGGING = false;

let gRemoteStorage;

// Context menu commands
let gCmd = {
  async open(aBookmarkID, aURL)
  {
    let tabs = await browser.tabs.query({active: true, currentWindow: true});
    log(`remoteStorage Demo: Navigating to url: ${aURL}`);
    await browser.tabs.update(tabs[0].id, {
      active: true,
      url: aURL,
    });
  
    this._afterBookmarkOpened(aBookmarkID);
  },

  openInNewTab(aBookmarkID, aURL)
  {
    browser.tabs.create({url: aURL});
    this._afterBookmarkOpened(aBookmarkID);
  },

  openInNewWnd(aBookmarkID, aURL)
  {
    browser.windows.create({url: aURL});
    this._afterBookmarkOpened(aBookmarkID);
  },

  async openInNewPrivateWnd(aBookmarkID, aURL)
  {
    try {
      await browser.windows.create({url: aURL, incognito: true});
    }
    catch (e) {
      console.error("remoteStorage Demo: Error from sidebar context menu: " + e);
    }
    this._afterBookmarkOpened(aBookmarkID);
  },

  deleteBookmark(aBookmarkID)
  {
    gRemoteStorage.bookmarks.remove(aBookmarkID);
    removeReadingListItem(aBookmarkID);
  },

  // Helper
  async _afterBookmarkOpened(aBookmarkID)
  {
    let deleteReadLinks = await aePrefs.getPref("deleteReadLinks");
    if (deleteReadLinks) {
      // TEMPORARY
      // TO DO: Delete the bookmark after the page has finished loading.
      window.setTimeout(() => { this.deleteBookmark(aBookmarkID) }, 3000);
      // END TEMPORARY
    }
    else {
      // TO DO: Set the bookmark status to "Read" in the reading list
    }
  },
};


// Sidebar initializion
$(async () => {
  let syncEnabledFromExtPrefs = await aePrefs.getPref("syncEnabledFromExtPrefs");
  if (syncEnabledFromExtPrefs) {
    await aePrefs.setPrefs({syncEnabledFromExtPrefs: false});
  }

  await initRemoteStorage();

  initContextMenu.showOpenInPrivBrwsOpt = await browser.extension.isAllowedIncognitoAccess();
  initContextMenu();
});


async function initRemoteStorage()
{
  log("remoteStorage Demo: initRemoteStorage(): Initializing sidebar.");
  let prefs = await aePrefs.getAllPrefs();

  log("remoteStorage Demo: initRemoteStorage(): Initializing remoteStorage instance");
  gRemoteStorage = new RemoteStorage({
    modules: [ aeBookmarks ],
    logging: RS_LOGGING
  });

  if (prefs.syncEnabled) {
    log("remoteStorage Demo: initRemoteStorage(): Sync enabled.");

    aeOAuth.init(prefs.syncClient);
    let apiKey;
    try {
      apiKey = aeOAuth.getAPIKey();
    }
    catch (e) {
      console.error(e);
      return;
    }

    if (prefs.syncClient == aeConst.RS_BACKEND_DROPBOX) {
      let result = gRemoteStorage.setApiKeys({
        dropbox: apiKey,
      });
      log(`remoteStorage Demo: initRemoteStorage(): Result from setting Dropbox app key: ${result}`);

      gRemoteStorage.access.claim("files.content.write", "rw");
      gRemoteStorage.access.claim("files.content.read", "r");
      gRemoteStorage.caching.enable("/bookmarks/");
      gRemoteStorage.dropbox.configure({token: prefs.accessToken});
      log("remoteStorage Demo: Connected to Dropbox backend.  Access token: " + prefs.accessToken);

      gRemoteStorage.dropbox.connect();

      let userInfo = await gRemoteStorage.dropbox.info();
      log("Dropbox user info: ");
      log(userInfo);
    }
    else if (prefs.syncClient == aeConst.RS_BACKEND_GOOGLE_DRIVE) {
      let result = gRemoteStorage.setApiKeys({
        googledrive: apiKey,
      });
      log(`remoteStorage Demo: initRemoteStorage(): Result from setting Google Drive client ID: ${result}`);

      gRemoteStorage.access.claim("drive.file", "rw");
      //remoteStorage.access.claim("drive.appdata", "rw");
      //remoteStorage.access.claim("drive.install", "rw");
      gRemoteStorage.caching.enable("/bookmarks/");
      gRemoteStorage.googledrive.configure({token: prefs.accessToken});
      log("remoteStorage Demo: initRemoteStorage(): Connected to Google Drive backend.  Access token: " + prefs.accessToken);

      // BUG!! This starts the OAuth flow, even if an access token is already configured!
      gRemoteStorage.googledrive.connect();

      let isConnected = gRemoteStorage.googledrive.connected;
      log(`It is ${isConnected} that the Google Drive backend is connected.`);
      let isOnline = gRemoteStorage.googledrive.online;
      log(`It is ${isOnline} that the Google Drive backend is online.`);
      let clientID = gRemoteStorage.googledrive.clientId;
      log(`Google Drive client ID: ${clientID}`);
      let rs = gRemoteStorage.googledrive.rs;
      log(`Instance of remoteStorage in Google Drive backend (should NOT be null or undefined): ${rs}`);

      // BUG!!
      // Can't make info call, because this causes a CORS error when attempting
      // to call Google Drive API.
      /***
      let userInfo = await remoteStorage.googledrive.info();
      log("Google Drive user info: ");
      log(userInfo);
      ***/
    }
    else {
      // remoteStorage backend
      gRemoteStorage.access.claim("bookmarks", "rw");
      gRemoteStorage.caching.enable("/bookmarks/");

      let userAddress = await aePrefs.getPref("rsUserAddress");
      try {
        gRemoteStorage.connect(userAddress);
      }
      catch (e) {
        console.error("remoteStorage Demo: Error: " + e);
      }
    }

    let syncIntvl = gRemoteStorage.getSyncInterval();
    let bkgdSyncIntvl = gRemoteStorage.getBackgroundSyncInterval();
    let reqTimeout = gRemoteStorage.getRequestTimeout();
    log(`Sync interval (ms): ${syncIntvl}\nBackground sync interval (ms): ${bkgdSyncIntvl}\nRequest timeout (ms): ${reqTimeout}`);
  }

  gRemoteStorage.on("connected", async () => {
    log("remoteStorage Demo: Connected to remote storage.");
    let userAddress = gRemoteStorage.remote.userAddress;
    log(`${userAddress} connected their remote storage.`);

    if (prefs.syncEnabled) {
      let syncClient = await aePrefs.getPref("syncClient");
      let isConnected, backendName;
      if (syncClient == aeConst.RS_BACKEND_DROPBOX) {
        isConnected = gRemoteStorage.dropbox.connected;
        backendName = "Dropbox";
      }
      else if (syncClient == aeConst.RS_BACKEND_GOOGLE_DRIVE) {
        isConnected = gRemoteStorage.googledrive.connected;
        backendName = "Google Drive";
      }
      log(`It is ${isConnected} that the ${backendName} backend is connected to remoteStorage.`);
    }
    else {
      log("Sync is turned off from extension preferences.");
    }
  });

  gRemoteStorage.on("not-connected", () => {
    log("remoteStorage Demo: No storage connected, operating in anonymous mode.");
    hideToolbar();
    showWelcome();
  });

  gRemoteStorage.on("error", aErr => {
    console.error("remoteStorage Demo: An error has occurred: " + aErr);
    showToolbar();
    $("#msg-banner").text(`❗️ ${aErr.name}`);
  });

  gRemoteStorage.on("network-offline", () => {
    showToolbar();
    $("#msg-banner").text("🚫 offline");
  });

  gRemoteStorage.on("network-online", () => {
    $("#msg-banner").text("");
  });

  gRemoteStorage.on("ready", async () => {
    console.info("remoteStorage Demo: remoteStorage is ready.");

    let syncEnabledFromExtPrefs = await aePrefs.getPref("syncEnabledFromExtPrefs");
    if (syncEnabledFromExtPrefs) {
      warn("remoteStorage Demo: Sync was just enabled; exiting 'ready' event handler to avoid populating duplicate reading list items.");
      await aePrefs.setPrefs({syncEnabledFromExtPrefs: false});
      return;
    }

    log("Clearing reading list...");
    clearReadingListItems();
    log("Populating reading list from 'ready' event handler...");
    await loadBookmarks();
  });
}


async function loadBookmarks()
{
  if (loadBookmarks.numAttempts > aeConst.MAX_LOAD_BKMK_ATTEMPTS) {
    log("remoteStorage Demo: loadBookmarks(): Maximum number of attempts reached");
    $("#loading-msg").text("unable to load reading list");
    loadBookmarks.numAttempts = 0;
    loadBookmarks.timerID = null;
    return;
  }

  let bookmarks = await gRemoteStorage.bookmarks.getAll();
  let numBkmks = Object.keys(bookmarks).length;
  if (numBkmks == 0) {
    log("remoteStorage Demo: loadBookmarks(): There are zero bookmarks; returning.");

    // Handle the case where sync is turned on and there are no bookmarks.
    let prefs = await aePrefs.getAllPrefs();
    if (prefs.syncClient || prefs.rsUserAddress) {
      hideWelcome();
      showToolbar();
    }
    enableAddLinkBtn();
    return;
  }

  hideWelcome();

  for (let i = 0; i < numBkmks; i++) {
    if (typeof bookmarks[i] == "boolean") {
      log("remoteStorage Demo: loadBookmarks(): It appears that the reading list data isn't fully synced.  Retrying...");
      loadBookmarks.numAttempts++;
      updateLoadingStatus();
      try {
        await browser.runtime.sendMessage({
          id: "sync-activation-status",
          isSyncRunning: true,
        });
      }
      catch {}

      loadBookmarks.timerID = window.setTimeout(() => { loadBookmarks() }, 3000);
      return;  
    }
  }

  log("remoteStorage Demo: loadBookmarks(): The reading list data is fully loaded.  Proceeding with populating the reading list sidebar");
  loadBookmarks.numAttempts = 0;
  loadBookmarks.timerID = null;
  hideLoadingStatus();
  populateReadingList(bookmarks);
  showToolbar();
  enableAddLinkBtn();
  try {
    await browser.runtime.sendMessage({
      id: "sync-activation-status",
      isSyncRunning: false,
    });
  }
  catch {}
}
loadBookmarks.numAttempts = 0;
loadBookmarks.timerID = null;


function populateReadingList(aBookmarks)
{
  let numBkmks = Object.keys(aBookmarks).length;
  log(`remoteStorage Demo: ${numBkmks} items.`);
  log(aBookmarks);

  for (let bkmkID in aBookmarks) {
    addReadingListItem(aBookmarks[bkmkID]);
  }
}


async function addReadingListItem(aBookmark)
{
  let tooltipText = `${aBookmark.title}\n${aBookmark.url}`;
  let listItem = $("<div>").addClass("reading-list-item").attr("title", tooltipText)[0];
  listItem.dataset.id = aBookmark.id;
  listItem.dataset.title = aBookmark.title;
  listItem.dataset.url = aBookmark.url;

  let listItemTitle = $("<span>").addClass("reading-list-item-title").text(aBookmark.title);
  $("#reading-list").append($(listItem).append(listItemTitle));
}


function removeReadingListItem(aBookmarkID)
{
  let bkmkElt = $(`.reading-list-item[data-id="${aBookmarkID}"]`);
  bkmkElt.fadeOut(800);
}


function clearReadingListItems()
{
  $("#reading-list").empty();
}


function initContextMenu()
{
  $.contextMenu({
    selector: ".reading-list-item",
    items: {
      openInNewTab: {
        name: "open in new tab",
        callback(aKey, aOpt) {
          let bkmkElt = aOpt.$trigger[0];
          gCmd.openInNewTab(bkmkElt.dataset.id, bkmkElt.dataset.url);
        }
      },
      openInNewWnd: {
        name: "open in new window",
        callback(aKey, aOpt) {
          let bkmkElt = aOpt.$trigger[0];
          gCmd.openInNewWnd(bkmkElt.dataset.id, bkmkElt.dataset.url);
        }
      },
      openInNewPrivateWnd: {
        name: "open in new private window",
        async callback(aKey, aOpt) {
          let bkmkElt = aOpt.$trigger[0];
          let url = bkmkElt.dataset.url;
          gCmd.openInNewPrivateWnd(bkmkElt.dataset.id, bkmkElt.dataset.url);
        },
        visible(aKey, aOpt) {
          return initContextMenu.showOpenInPrivBrwsOpt;
        }
      },
      separator: "---",
      deleteBookmark: {
        name: "delete",
        callback(aKey, aOpt) {
          let bkmkElt = aOpt.$trigger[0];
          let bkmkID = bkmkElt.dataset.id;
          log(`remoteStorage Demo::sidebar.js: Removing bookmark ID: ${bkmkID}`);

          gCmd.deleteBookmark(bkmkID);
        }
      }
    }
  });
}
initContextMenu.showOpenInPrivBrwsOpt = false;


function showWelcome()
{
  $("#welcome").show();
}


function hideWelcome()
{
  $("#welcome").hide();
}


function showError(aMessage)
{
  $("#error-msg").text(aMessage);
  $("#error").show();
}


function updateLoadingStatus()
{
  let loadingStatus = $("#loading");
  let isHidden = window.getComputedStyle(loadingStatus[0]).getPropertyValue("display") == "none";
  if (isHidden) {
    loadingStatus.css({display: "block"});
  }
  let currentProgress = $("#progress-bar").text();
  $("#progress-bar").text(currentProgress.concat("\u2219"));
}


function hideLoadingStatus()
{
  $("#loading").css({display: "none"});
  $("#progress-bar").text("");
}


function showToolbar()
{
  $("#toolbar").show();
}


function hideToolbar()
{
  $("#toolbar").hide();
}


function enableAddLinkBtn()
{
  $("#add-link").removeAttr("disabled");
}


function disableAddLinkBtn()
{
  $("#add-link").attr("disabled", "true");
}


//
// Event handlers
//

browser.runtime.onMessage.addListener(async (aMessage) => {
  log(`remoteStorage Demo::sidebar.js: Received extension message "${aMessage.id}"`);
  if (aMessage.id == "sync-setting-changed") {
    warn("remoteStorage Demo: Disconnecting storage regardless of previous sync setting.");
    gRemoteStorage.disconnect();
    disableAddLinkBtn();

    if (aMessage.syncEnabled) {
      warn("Sync was turned ON from extension preferences.");
      await initRemoteStorage();
    }
    else {
      warn("remoteStorage Demo: Sync was turned OFF from extension preferences.");
    }
  }
  else if (aMessage.id == "sync-disconnected-from-ext-prefs") {
    if (loadBookmarks.numAttempts > 0) {
      warn("Disconnected from remote storage while sync in progress, aborting sync.");
      window.clearTimeout(loadBookmarks.timerID);
      loadBookmarks.numAttempts = 0;
      hideLoadingStatus();
      showWelcome();
    }
  }
});


$(window).on("unload", async (aEvent) => {
  // Closing sidebar, interrupting sync in progress.
  if (loadBookmarks.numAttempts > 0) {
    try {
      await browser.runtime.sendMessage({
        id: "sync-activation-status",
        isSyncRunning: false,
      });
    }
    catch {}
  }
});


$("#setup").on("click", aEvent => {
  browser.runtime.openOptionsPage();
});


$("#add-link").on("click", async (aEvent) => {
  let tabs = await browser.tabs.query({active: true, currentWindow: true});
  let title = tabs[0].title;
  let url = tabs[0].url;
  let bkmk;

  try {
    bkmk = await gRemoteStorage.bookmarks.add({
      title, url,
      unread: true,
    });
    log("remoteStorage Demo: Successfully added bookmark:");
    log(bkmk);
  }
  catch (e) {
    console.error("remoteStorage Demo: Validation error: " + e);
    return;
  }

  addReadingListItem(bkmk);
});


$("#reading-list").on("click", async (aEvent) => {
  let readingListItem;
  if (aEvent.target.className == "reading-list-item-title") {
    readingListItem = aEvent.target.parentNode;
  }
  else if (aEvent.target.className == "reading-list-item") {
    readingListItem = aEvent.target;
  }

  gCmd.open(readingListItem.dataset.id, readingListItem.dataset.url);
});


$(document).on("contextmenu", aEvent => {
  aEvent.preventDefault();
});


function log(aMessage)
{
  if (aeConst.DEBUG) { console.log(aMessage) }
}


function warn(aMessage)
{
  if (aeConst.DEBUG) { console.warn(aMessage) }
}
