import @libs/html/basic
import @styles/docs {navbar, footer, title}

# int ~= 0
# float ~= 0.0

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

thing = not true

loop items |item, index|:
    io([index]: [item])
;

if thing is:
    case 0 => io("zero")
    case < 0 => io("negative")
    case > 1 => io("big number")
    case not 5 => io("not 5")
    else => io("only one")
;

-- Matching choices
if Catagory is:
case A =>
    io("Category A")
case B =>
    io("Category B")
case C |message| =>
    io([:Category C with message: [message]])
;

-- Creating an error type
Error = |
    msg String,
    context ~{String},
|

-- Functions use the '!' to show that they can return an error instead of any other values
-- This error must always be handled at the call site,
-- The '!' symbol provides convenient syntax sugar for this
canError |x String| -> String, Float, Error!:

    if x.is_empty():
        return! Error("Whoops", {})
    ;

    return [x, " is cool"], 3.14
;

defaultIfError || -> String, Float:
    string, number = canError("") ! "", 0.0
    return string, number
;

bubble_up_error_with_context |name String| -> Error!:
    value, number = canError(name) err!:
        err.context.push("bubbled up from this function")
        return! err
    ;

    io([value, number])
;