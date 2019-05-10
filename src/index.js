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
const urlCategories = "https://www.freecodecamp.org/forum/c/";
const urlPost = "https://www.freecodecamp.org/forum/t/";
const spc = "            ";
const keyBindingInfo = `${spc}q=quit h=back j=↓ k=↑ l/enter=select mouse=enabled`;
const arr = [
  ["project-feedback"],
  ["getting-a-developer-job"],
  ["motivation"],
  ["javascript"],
  ["html-css"],
  ["help"],
  ["linux-and-git"],
  ["python"],
  ["data"],
  ["contributors"],
  ["reviews"],
  ["support"],
  ["general"]
];

const fetchCategory = ctx => {
  let url = `${urlCategories}${ctx.query}.json`;
  return got(url, gotOptions).then(response => response.body);
};

const fetchPost = ctx => {
  let url = `${urlPost}${ctx.query}.json`;
  return got(url, gotOptions).then(response => response.body);
};

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
      query: ""
    },
    states: {
      first: {
        onEntry: [initial],
        on: {
          "": {
            target: "home"
          }
        }
      },
      home: {
        id: "homeID",
        on: {
          FETCH: {
            target: "loadingcategory",
            actions: [assign({ query: (ctx, event) => event.query })]
          }
        }
      },
      loadingcategory: {
        invoke: {
          id: "getcatID",
          src: (ctx, event) => fetchCategory(ctx, event),
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
          src: (ctx, event) => fetchPost(ctx, event),
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
            target: "postslist"
          }
        }
      },
      successpost: {
        on: {
          "": {
            target: "post"
          }
        }
      },
      failure: {},
      postslist: {
        onEntry: [displayList],
        on: {
          FETCH: {
            target: "loadingpost",
            actions: assign({ query: (ctx, event) => event.query })
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
service.start();

function initial() {
  let a = [[`CATEGORIES${keyBindingInfo}`]].concat(arr);
  screen.append(loadingBox);
  screen.append(box);
  screen.append(table);
  table.focus();
  table.setData(a);
  screen.render();
}

function home(arg) {
  let a = [[`CATEGORIES${keyBindingInfo}`]].concat(arr);
  box.hide();
  table.setData(a);
  table.show();
  table.focus();
  screen.render();
}

function displayLoading(ctx) {
  loadingBox.show();
}

function hideLoading() {
  loadingBox.hide();
}

function displayList(ctx) {
  let a = ctx.query;
  let d = ctx.datalist.topic_list.topics;
  let e = d.map(elem => [`${elem.slug}`]);

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
