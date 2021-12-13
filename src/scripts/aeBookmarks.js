/* -*- mode: javascript; tab-width: 8; indent-tabs-mode: nil; js-indent-level: 2 -*- */

var aeBookmarks = {
  name: "bookmarks",
  builder: function (privateClient, publicClient) {

    //
    // Schema
    //
    
    privateClient.declareType("readlater-bookmark", {
      "type": "object",
      "properties": {
        "id": {
          "type": "string"
        },
        "url": {
          "type": "string",
          "format": "uri"
        },
        "title": {
          "type": "string"
        },
        "createdAt": {
          "type": "string",
          "format": "date-time"
        },
        "updatedAt": {
          "type": "string",
          "format": "date-time"
        },
        "unread": {
          "type": "boolean",
          "default": true
        }
      },
      "required": [ "title", "url", "unread" ]
    });

    privateClient.on("change", aEvent => {
      console.log("aeBookmark: Data was added, updated or removed: ");
      console.log(aEvent);
    });


    //
    // Private helper functions
    //
    
    function urlHash(aURL)
    {
      return md5(aURL);
    }


    //
    // Public functions
    //
    
    return {
      exports: {
        add: function (bookmark)
        {
          bookmark.id = this.idForUrl(bookmark.url);
          if (bookmark.createdAt) {
            bookmark.updatedAt = new Date().toISOString();
          }
          else {
            bookmark.createdAt = new Date().toISOString();
          }
          var path = "archive/" + bookmark.id;

          return privateClient.storeObject("readlater-bookmark", path, bookmark).then(() => {
            return bookmark;
          });
        },

        remove: function (id)
        {
          var path = "archive/" + id;
  
          return privateClient.remove(path);
        },

        find: function (id)
        {
          var path = "archive/" + id;
  
          return privateClient.getObject(path).then(function (bookmark) {
            return bookmark;
          });
        },

        searchByURL: function (url)
        {
          var id = this.idForUrl(url);
          var path = "archive/" + id;
          return privateClient.getObject(path);
        },

        getAll: function (maxAge)
        {
          return privateClient.getAll('archive/', maxAge).then(function (bookmarks) {
            if (! bookmarks) {
              return [];
            }
            return Object.keys(bookmarks).map(function (id) {
              return bookmarks[id];
            });
          });
        },

        idForUrl: function (url)
        {
          return urlHash(url);
        }
      },
    };
  }
};
/***  
  //
  // Public functions
  //

  var bookmarks = {
    name: 'bookmarks',
    archive: {

      find: function(id) {
        var path = "archive/" + id;

        return privateClient.getObject(path).then(function(bookmark){
          return bookmark;
        });
      },

      getAll: function(maxAge) {
        return privateClient.getAll('archive/', maxAge).then(
        // return privateClient.getAll('archive/', 'archive-bookmark').then(
          function(bookmarks) {
            if (!bookmarks) {
              return [];
            }
            return Object.keys(bookmarks).map(function(id) {
              return bookmarks[id];
            });
          });
      },

      searchByURL: function(url) {
        var id = this.idForUrl(url);
        var path = "archive/" + id;
        return privateClient.getObject(path);
      },

      searchByTags: function(tags) {
        return this.getAll()
          .then( bookmarks => {
            if (!bookmarks) return []
            return bookmarks.filter( b => b.tags && intersection(b.tags, tags).length )
          })
      },

      store: function(bookmark) {
        bookmark.id = urlHash(bookmark.url);
        if (bookmark.createdAt) {
          bookmark.updatedAt = new Date().toISOString();
        } else {
          bookmark.createdAt = new Date().toISOString();
        }
        var path = "archive/" + bookmark.id;

        return privateClient.storeObject("archive-bookmark", path, bookmark).
          then(function() {
            return bookmark;
          });
      },

      remove: function(id) {
        var path = "archive/" + id;

        return privateClient.remove(path);
      },

      idForUrl: function(url) {
        return urlHash(url);
      }

    },

    client: privateClient

  };
};
***/
