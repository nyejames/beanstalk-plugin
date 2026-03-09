import @(a/b/c)
import @(styles/docs/{footer, navbar})
import @(styles\\docs\\footer)
import @a/b/c
import @styles/docs/{footer, navbar}
import @styles/docs/ {footer, navbar}
import @(styles/docs/ {footer, navbar})

escaped_string = "line\\n with \\a and \\[ and \\]"

wrapper = [:
    before [$slot] after
    before named [$slot("style")] after
    [$code("bst"):
        thing = [: hello]
    ]
]

title = [:
    <h1 style="[$slot("style")]">
        [$slot]
    </h1>
]

blue = [$insert("style"): color: blue;]

filled = [title, blue:
    Hello world
]

markdown_view = [$code("js"), $markdown:

# Title
some text
and then *italic* **bold** text
check link @https://example.com/docs (Project Docs)
check route @/docs/getting-started (Guide)

\n escaped text \[\]
## Subtitle
        ### Deep Indented Subtitle
more text

    # whooooooooops

]

css_view = [$css:
.card {
    color: red;
    content: "[alpha [beta]]";
}
]

code_generic = [$code:
loop i in 0 to 10 by 2:
    io(i)
escaped = \a \[ \]
;
]

code_bst = [$markdown, $code("bst"):
loop i in 10 upto 0 by 2:
    io(i)
;
]

code_js = [$markdown, $code("js"):
const x = 1;
const nested = [1, [2, [3]]];
// comment
]

code_ts = [$code("ts"):
type Name = string;
]

code_py = [$code("py"):
def run():
    return 1
]

styled = [$children([: Prefix]), $slot, $ignore:
Body content
]

note_template = [$note[
Remember this [nested [note]] and ignore output.
]]

todo_template = [$todo[
Follow up on [rendering [edge cases]] next.
]]

doc_template = [$doc[
# Template Docs
Use @https://example.com/docs (Project Docs) for setup.
Brackets [stay [inside]] this doc block.
]]

formatter_hint = [$formatter(markdown, 10):
Body content
]

# default_style = [$css:
    @charset "UTF-8";
    :root {
      color-scheme: light dark;
      /* Default Background Colours */
      --bst-bg-lightmode: #fff;
      --bst-bg-darkmode: #13171f;
      --bst-text-lightmode: #373c44;
      --bst-text-darkmode: #e0e3e7;
      --bst-font-family-emoji: "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
      --bst-line-height: 1.5;
      --bst-font-weight: 400;
      --bst-font-size: 100%;
    }

    @media (min-width: 1536px) {
      :root {
        --bst-font-size: 131.25%;
      }
      .container {
        max-width: 1450px;
      }
    }

    .bst-code-keyword {
      color: var(--keyword-light);
      color:light-dark( var(--keyword-light), var(--keyword-dark))
    }
    .bst-code-string {
      color: var(--string-light);
      color:light-dark( var(--string-light), var(--string-dark))
    }

    /* BASIC CSS RESET STUFF */

    /**
     * Document
     * Content-box & Responsive typography
    */
    *,
    *::before,
    *::after {
      box-sizing: border-box;
      background-repeat: no-repeat;
    }

    ::before,
    ::after {
      text-decoration: inherit;
      vertical-align: inherit;
    }
]

