import @(libs/html/basic)
import @(styles/docs/{navbar, footer, title})

Basic = |
    document String = [:
        <head>
            [$slot]
            <style>
                [default_style]
            </style>
        </head>
        <body> [$slot]</body>
    ],
    page String = [$markdown:<section>[:[$slot]][$slot][$slot][$slot]</section>],

    -- Basic formatting
    center String = [:<span align="center">[$slot]<span/>],
    underline String = [:<u>[$slot]</u>],
    strikethrough String = [:<s>[$slot]</s>],
|

beans = "Hello, World!"
float Float = 3.14 + 2.71

func |arg String| -> Float:
    loop c in arg:
        if c == 'x':
            return 0.0
        ;
    ;

    return 1.0
;

Basic = |
    beans String = [: Hello World!]
|


[$code("bst"):
    int ~= 0
    float ~= 0.0

    string_slice ~= "wow!"
    char ~= '😊'
    raw_string_slice ~= `hi`

    string_template ~= [:
        This is the Beanstalk programming language
    ]

    bool ~= true

    mutable_collection ~= {}
    immutable_collection = {}

    NewStruct = |
        value Float,
        another_value String,
    |
    
    instance ~= NewStruct(
        value = 1.2, 
        another_value = "hey"
    )
]