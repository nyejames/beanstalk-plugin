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
\n escaped text \[\]
## Subtitle
        ### Deep Indented Subtitle
more text

    # whooooooooops

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

styled = [$[: Prefix], $ignore, $formatter(markdown, 10):
Body content
]
