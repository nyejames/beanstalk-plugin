-- Single-line comment

import @styles/docs {navbar, title, section}
import @html {center}
import @core/math as math
import @strings {
    @nested/import {parse_number, identity},
    thing as another_thing,
}

page_title #= "Templates"
page_description #String = "Template syntax in Beanstalk."
page_head #= theme_head

#[p: This paragraph is styled by the HTML builder's @html constants. ]

count ~= 0
ratio Float = 1.5
text_slice = "text"
raw_slice = `raw`
letter = 'A'

message = [:
    Templates create owned strings.
]

circle_img_css #= [$css("inline"):
    aspect-ratio: 1/1;
    clip-path: circle(55%);
    border: 3px solid #ddd;
    border-radius: 50%;
]

values ~{Int} = {}
names {String} = {"Priya", "Gollum"}

Person = |
    name String,
    age Int,
|

Status ::
    Ready,
    Failed | message String |,
;

increment |value Int| -> Int:
    return value + 1
;

name, count = pair()

display |this Person| -> String:
    return this.name
;

vec ~= Person(name = "Nye", age = 30)
~vec.display()

if value is true:
    io("then")
else
    io("else")
;

if value is:
    0 => io("zero")
    else =>
;

loop items |item, index|:
    io([item])
;

loop 0 to 10 by 2 |i|:
    io([i])
;

loop 0 to & 10 |i|:
    io([i])
;

assert(index < items.length)
assert(index < items.length, "out of bounds")

maybe_name String? = none
display_name = if maybe_name is |name| then name else "guest"

value = parse_number(text)!
fallback = parse_number(text) catch:
    then 0
;

count_text String = cast count
value = identity(42)

-- Template with markdown
[$markdown:
    # Hello
    This is *markdown*.

    @example.com (Here is a link!)

    Some `inline code` here.
]

-- Template with code blocks
[codeblock, $code("bst"):
    io("Hello, World!")

    import @html {p}
    name = "Alice"
    io([: Hello, [name]])
]

[codeblock, $code("js"):
    const x = 42;
    function greet(name) {
        return `Hello, ${name}`;
    }
]

[codeblock, $code("ts"):
    interface User {
        name: string;
        age: number;
    }
    const user: User = { name: "Ada", age: 30 };
]

[codeblock, $code("py"):
    def greet(name: str) -> str:
        return f"Hello, {name}"
]

[codeblock, $code("rs"):
    fn main() {
        println!("Hello, world!");
    }
]

[codeblock, $code("rust"):
    struct Point {
        x: f64,
        y: f64,
    }
]

[codeblock, $code("sh"):
    echo "Hello, world!"
    ls -la
]

[codeblock, $code("shell"):
    #!/bin/bash
    for f in *.txt; do
        echo "$f"
    done
]

[codeblock, $code("bash"):
    export PATH="/usr/local/bin:$PATH"
]

-- Template with slot and insert
[$slot]

[$slot("style")]

[$insert("style"): color: blue;]

[$children([: Prefix]):
    [: one]
]

-- Template control flow
[if show:
    Visible
]

[list, if show:
    Visible inside list
]

[loop has_next():
    [next_item()]
]

[loop items |item|:
    [if item.skip:
        [continue]
    ]
    [item]
]

-- Template with CSS and HTML directives
[$css:
    body {
        color: red;
    }
]

circle_img_css #= [$css:
    aspect-ratio: 1/1;
    margin-right: 1.6rem;
    margin-left: 1.2rem;
    max-width: 180px;
    min-width: 120px;
    clip-path: circle(55%);
    border: 3px solid #ddd;
    border-radius: 50%;
    padding: 5px;
]

after_css_marker = "not css"

[$html:
    <h1>Title</h1>
    <p>Paragraph</p>
]

#[section, $markdown:
    ## Authoring a Beandown file

    Write markdown and nested Beanstalk templates directly in the `.bd` file:

    [codeblock, $code("bst"):
        # docs/intro.bd

        # Getting started

        [p:
            This paragraph is styled by the HTML builder's @html constants.
        ]
    ]

    Beandown starts inside a template body, so `--`, backticks, and backslashes are normal text.
    It also uses the same `$markdown` inline-code rules as `.bst` markdown templates.

    Literal template delimiters use normal string insertion:

    [codeblock, $code("bst"):
        ["["]
        ["]"]
        ["[literal]"]
    ]
]

-- Escape sequences
escaped = \n \a \[ \]

-- This receiver param
reset |this ~Vector2|:
    this.x = 0
    this.y = 0
;

-- Traits
SHOW must:
    show |This| -> String
;
