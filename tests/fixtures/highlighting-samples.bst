import @(a/b/c)
import @(styles/docs/{footer, navbar})
import @(styles\\docs\\footer)

@not_a_path

wrapper = [:
    before [..] after
]

filled = [wrapper:
    [$1: first slot]
    [$2]
]

markdown_view = [$code("js"), $markdown:

# Title
*italic* **bold**

]

code_generic = [$code:
loop i in 0 to 10 by 2:
    io(i)
;
]

code_bst = [$markdown, $code("bst"):
loop i in 10 upto 0 by 2:
    io(i)
;
]

code_js = [$markdown, $code("js"):
const x = 1;
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
