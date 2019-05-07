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
const got = require("got");
const blessed = require("blessed");
const screen = blessed.screen(screenOptions);
const table = blessed.listtable(tableOptions);
const box = blessed.box(boxOptions);
const htmlToText = require("html-to-text");
const Machine = require("xstate").Machine;
const interpret = require("xstate").interpret;
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

// Quit on Escape, q, or Control-C.
screen.key(["escape", "q", "C-c"], function(ch, key) {
  return process.exit(0);
});

screen.key(["h"], function(ch, key) {
  // back key
  service.send("H");
});

table.on("select", async function(key) {
  let a = table.getItem(table.selected);
  let b = a.getContent().trimEnd();

  let input = arr.flat().includes(b)
    ? b.replace(/-/gi, "").toUpperCase()
    : "POST";

  service.send(input);
});

const statechart = Machine(
  {
    id: "statechartID",
    initial: "first",
    context: {
      data: "data"
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
          PROJECTFEEDBACK: {
            target: "postslist"
          },
          GETTINGADEVELOPERJOB: {
            target: "postslist"
          },
          MOTIVATION: {
            target: "postslist"
          },
          JAVASCRIPT: {
            target: "postslist"
          },
          HTMLCSS: {
            target: "postslist"
          },
          HELP: {
            target: "postslist"
          },
          LINUXANDGIT: {
            target: "postslist"
          },
          PYTHON: {
            target: "postslist"
          },
          DATA: {
            target: "postslist"
          },
          CONTRIBUTORS: {
            target: "postslist"
          },
          REVIEWS: {
            target: "postslist"
          },
          SUPPORT: {
            target: "postslist"
          },
          GENERAL: {
            target: "postslist"
          }
        }
      },
      postslist: {
        onEntry: [displayList],
        on: {
          POST: {
            target: "post"
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
            target: "home",
            actions: [home]
          }
        }
      }
    } // ./states
  },
  {
    actions: {
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

async function displayList() {
  let a = table.getItem(table.selected);
  let b = a.getContent().trimEnd();
  let c = await got(`${urlCategories}${b}.json`, gotOptions);
  let d = await c.body.topic_list.topics;
  let e = d.map(elem => [`${elem.slug}`]);

  table.setData([[`${b.toUpperCase()}${keyBindingInfo}`]].concat(e));
  table.show();
  table.focus();
  screen.render();
}

async function displayPost() {
  let a = table.getItem(table.selected);
  let b = a.getContent().trimEnd();
  let c = await got(`${urlPost}${b}.json`, gotOptions);
  let d = await c.body.post_stream.posts;
  let arr = d.map(elem => `<h2>${elem.username}</h2>${elem.cooked}<br>`);
  let text = arr.toString();
  let textS = htmlToText.fromString(text, { wordwrap: false });

  table.hide();
  box.setContent(textS);
  box.show();
  box.focus();
  screen.render();
}
