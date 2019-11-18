#!/usr/bin/env node
/* jshint esversion: 8 */
const gotOptions = {
  json: true,
  timeout: 8000,
  retries: 3
};

const screenOptions = {
  autoPadding: true,
  smartCSR: true,
  fullUnicode: true,
  title: "freeCodeCamp forum"
};

const tableOptions = {
  keys: true,
  vi: true,
  mouse: true,
  top: 0,
  left: 1,
  width: "100%",
  height: "100%",
  align: "left",
  border: {
    type: "line"
  },
  style: {
    header: {
      fg: "black",
      bg: "white",
      bold: true
    },
    cell: {
      selected: {
        bg: "blue"
      }
    }
  }
};

const boxOptions = {
  keys: true,
  vi: true,
  top: "center",
  left: "center",
  width: "80%",
  height: "100%",
  alwaysScroll: true,
  scrollable: true,
  scrollbar: true,
  tags: true,
  scrollbar: {
    bg: "blue"
  },
  border: {
    type: "bg"
  },
  style: {
    fg: "white",
    bg: "black",
    border: {
      fg: "#f0f0f0"
    }
  }
};

const loadingBoxOptions = {
  tags: true,
  content: "{center}{yellow-fg}Loading ...{/}",
  top: "20%",
  left: "center",
  width: "20%",
  height: "15%",
  draggable: true,
  border: {
    type: "line"
  },
  style: {
    fg: "white",
    bg: "black",
    border: {
      fg: "#f0f0f0"
    }
  }
};

const got = require("got");
const blessed = require("blessed");
const screen = blessed.screen(screenOptions);
const table = blessed.listtable(tableOptions);
const box = blessed.box(boxOptions);
const loadingBox = blessed.box(loadingBoxOptions);
const htmlToText = require("html-to-text");
const Machine = require("xstate").Machine;
const interpret = require("xstate").interpret;
const actions = require("xstate").actions;
const assign = actions.assign;
const log = actions.log;

const spc = "            ";
const keyBindingInfo = `${spc}q=quit h=back j=↓ k=↑ l/enter=select mouse=enabled`;

function fetchData(ctx, event, tag) {
  let url;
  const urlCat = "https://www.freecodecamp.org/forum/categories.json";
  const urlCategories = "https://www.freecodecamp.org/forum/c/";
  const urlPost = "https://www.freecodecamp.org/forum/t/";

  switch (tag) {
    case "fetchArr":
      url = urlCat;
      break;
    case "fetchCategory":
      url = `${urlCategories}${ctx.query}.json`;
      break;
    case "fetchPost":
      let a = ctx.datalist.topic_list.topics.filter(
        elem => elem.title === ctx.query
      );
      let b = a[0];
      url = `${urlPost}${b.slug}/${b.id}.json`;
      break;
  }
  return got(url, gotOptions).then(response => response.body);
}

// Quit on Escape, q, or Control-C.
screen.key(["escape", "q", "C-c"], function(ch, key) {
  return process.exit(0);
});

screen.key(["h"], function(ch, key) {
  // back key
  service.send("H");
});

table.on("select", function(key) {
  let a = table.getItem(table.selected);
  let b = a.getContent().trimEnd();

  service.send({ type: "FETCH", query: b });
});

const statechart = Machine(
  {
    id: "statechartID",
    initial: "first",
    context: {
      error: "",
      datapost: "",
      datalist: "",
      dataCategories: "",
      query: ""
    },
    states: {
      first: {
        invoke: {
          id: "firstID",
          src: (ctx, event) => fetchData(ctx, event, "fetchArr"),
          onDone: {
            target: "home",
            actions: assign({ dataCategories: (ctx, event) => event.data })
          },
          onError: {
            target: "failure",
            actions: assign({ error: (ctx, event) => event.data })
          }
        }
      },
      home: {
        id: "homeID",
        onEntry: [initial],
        on: {
          FETCH: {
            target: "loadingcategory",
            actions: [
              assign({ query: (ctx, event) => event.query }),
              displayLoading
            ]
          }
        }
      },
      loadingcategory: {
        invoke: {
          id: "getcatID",
          src: (ctx, event) => fetchData(ctx, event, "fetchCategory"),
          onDone: {
            target: "successcategory",
            actions: assign({ datalist: (ctx, event) => event.data })
          },
          onError: {
            target: "failure",
            actions: assign({ error: (ctx, event) => event.data })
          }
        }
      },
      loadingpost: {
        invoke: {
          id: "getpostID",
          src: (ctx, event) => fetchData(ctx, event, "fetchPost"),
          onDone: {
            target: "successpost",
            actions: [assign({ datapost: (ctx, event) => event.data })]
          },
          onError: {
            target: "failure",
            actions: assign({ error: (ctx, event) => event.data })
          }
        }
      },
      successcategory: {
        on: {
          "": {
            target: "postslist",
            actions: hideLoading
          }
        }
      },
      successpost: {
        on: {
          "": {
            target: "post",
            actions: hideLoading
          }
        }
      },
      failure: {
        onEntry: [displayFailure],
        onExit: [hideFailure],
        on: {
          H: {
            target: "home",
            actions: home
          },
          FETCH: {
            target: "loadingpost",
            actions: [
              assign({ query: (ctx, event) => event.query }),
              displayLoading
            ]
          }
        }
      },
      postslist: {
        onEntry: [displayList],
        on: {
          FETCH: {
            target: "loadingpost",
            actions: [
              assign({ query: (ctx, event) => event.query }),
              displayLoading
            ]
          },
          H: {
            target: "home",
            actions: [home]
          }
        }
      },
      post: {
        id: "postID",
        onEntry: [displayPost],
        on: {
          H: {
            target: "postslist"
          }
        }
      }
    }
  },
  {
    actions: {
      displayLoading: displayLoading,
      displayList: displayList,
      displayPost: displayPost,
      initial: initial,
      home: home
    }
  }
);

const service = interpret(statechart);
/*
 .onTransition(state => { 
 let currentState = state.value;
 let query        = state.context.query;
 let text = `state: ${currentState},${query}`; 
 loadingBox.show();
 loadingBox.setContent(text);
 });
*/

service.start();

function displayFailure(ctx) {
  loadingBox.setContent("{center}{yellow-fg}Something went wrong ...{/}");
  loadingBox.show();
  screen.render();
}

function hideFailure() {
  loadingBox.setContent("{center}{yellow-fg}Loading ...{/}");
  loadingBox.hide();
  screen.render();
}

function initial(ctx) {
  let categories = ctx.dataCategories.category_list.categories.map(elem => [
    `${elem.slug}`
  ]);
  let a = [[`CATEGORIES${keyBindingInfo}`]].concat(categories);
  screen.append(box);
  screen.append(table);
  screen.append(loadingBox);
  loadingBox.hide();
  table.focus();
  table.setData(a);
  screen.render();
}

function home(ctx) {
  let categories = ctx.dataCategories.category_list.categories.map(elem => [
    `${elem.slug}`
  ]);
  let a = [[`CATEGORIES${keyBindingInfo}`]].concat(categories);
  box.hide();
  table.setData(a);
  table.show();
  table.focus();
  screen.render();
}

function displayLoading(ctx) {
  loadingBox.show();
  // without this, the loadingBox is not shown (maybe a bug?)
  screen.render();
}

function hideLoading() {
  loadingBox.hide();
}

function displayList(ctx) {
  let a = ctx.query;
  let d = ctx.datalist.topic_list.topics;
  let e = d.map(elem => [`${elem.title}`]);

  box.hide();
  box.resetScroll();
  table.setData([[`${a.toUpperCase()}${keyBindingInfo}`]].concat(e));
  table.show();
  table.focus();
  screen.render();
}

function displayPost(ctx) {
  let d = ctx.datapost.post_stream.posts;
  let title = `{yellow-fg}{bold}${ctx.datapost.title}{/bold}{/yellow-fg}\n`;
  let keysInfo = `{right}{green-fg}q=quit h=back j=↓ k=↑{/green-fg}{/right}`;
  let arr = d.map(elem => `<h2>${elem.username}</h2><br>${elem.cooked}<br>`);
  let text = arr.toString();
  let textS = htmlToText.fromString(text, {
    wordwrap: false,
    uppercaseHeadings: false
  });

  table.hide();
  box.setContent(textS);
  box.insertTop(`${keysInfo}\n${title}`);
  box.show();
  box.focus();
  screen.render();
}
