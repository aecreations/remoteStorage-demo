# remoteStorage Demo
This demo browser extension for Mozilla Firefox adds a reading list sidebar to the browser window, where you can add links for reading later. It is intended to be a proof-of-concept of a Firefox extension that integrates with [remoteStorage](https://github.com/remotestorage/remotestorage.js).

### Features
- Add a link to the reading list sidebar in a single click
- Sync your reading list to other Firefox installations on other machines using [Dropbox](https://www.dropbox.com) or a [remoteStorage server](https://remotestorage.io/servers/)

### Known Issues
- Although remoteStorage supports Google Drive, it is not available as an option due to a serious bug when connecting to it
- Connecting to a remoteStorage server doesn't work
- Updating the sync data from Dropbox takes a long time

### How To Get It
This demo extension is _not_ available from Firefox Add-ons. To install it, you will need [Firefox Developer Edition](https://www.mozilla.org/en-US/firefox/developer/).

1. Download the source code of this extension to a file location on your system.
2. Open Firefox Developer Edition and navigate to `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on** and navigate to the location of the extension manifest file `manifest.json`
4. Follow the prompts to complete the installation

### Things You Should Know About
- As this extension is being installed as a temporary add-on, it will only be installed for the duration of the browser session, and will automatically remove itself when quitting Firefox.
- A [Dropbox account](https://www.dropbox.com) is needed to sync the reading list.

