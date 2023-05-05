// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
// Bypasses TS6133. Allow declared but unused functions.
// @ts-ignore
function id(d: any[]): any { return d[0]; }
declare var identifier: any;
declare var openBracket: any;
declare var closedBracket: any;
declare var openCurlyBracket: any;
declare var closedCurlyBracket: any;
declare var comma: any;
declare var colon: any;
declare var ws: any;
declare var longArrow: any;
declare var parallel: any;
declare var arrow: any;
declare var or: any;
declare var and: any;
declare var not: any;
declare var doubleEqual: any;
declare var unequal: any;
declare var smaller: any;
declare var smallerEqual: any;
declare var greater: any;
declare var greaterEqual: any;
declare var plus: any;
declare var minus: any;
declare var divide: any;
declare var multiply: any;
declare var percent: any;
declare var thisSymbol: any;
declare var returnSymbol: any;
declare var nullSymbol: any;
declare var number: any;
declare var point: any;
declare var boolean: any;
declare var string: any;
declare var int: any;
declare var equal: any;
declare var ifSymbol: any;
declare var thenSymbol: any;
declare var elseSymbol: any;
declare var switchSymbol: any;
declare var caseSymbol: any;

import moo from "moo";

const lexer = moo.compile({
    returnSymbol: /return/,
    nullSymbol: /null/,
    thisSymbol: /this/,
    ifSymbol: /if/,
    thenSymbol: /then/,
    elseSymbol: /else/,
    switchSymbol: /switch/,
    caseSymbol: /case/,
    arrow: /->/,
    longArrow: /-->/,
    openBracket: /\(/,
    closedBracket: /\)/,
    openCurlyBracket: /{/,
    closedCurlyBracket: /}/,
    point: /\./,
    comma: /,/,
    colon: /:/,
    smallerEqual: /<=/,
    greaterEqual: />=/,
    smaller: /</,
    greater: />/,
    doubleEqual: /==/,
    equal: /=/,
    unequal: /!=/,
    and: /&&/,
    or: /\|\|/,
    not: /!/,
    parallel: /\|/,
    int: /0[Xx][\da-fA-F]+|0[bB][01]+/,
    number: /-?\d+(?:\.\d+)?/,
    string: /"[^"]*"/,
    boolean: /true|false/,
    plus: /\+/,
    minus: /-/,
    multiply: /\*/,
    percent: /%/,
    divide: /\//,
    identifier: /[a-zA-Z_$@']+\w*/,
    ws: { match: /\s+/, lineBreaks: true },
});

interface NearleyToken {
  value: any;
  [key: string]: any;
};

interface NearleyLexer {
  reset: (chunk: string, info: any) => void;
  next: () => NearleyToken | undefined;
  save: () => any;
  formatError: (token: never) => string;
  has: (tokenType: string) => boolean;
};

interface NearleyRule {
  name: string;
  symbols: NearleySymbol[];
  postprocess?: (d: any[], loc?: number, reject?: {}) => any;
};

type NearleySymbol = string | { literal: any } | { test: (token: any) => boolean };

interface Grammar {
  Lexer: NearleyLexer | undefined;
  ParserRules: NearleyRule[];
  ParserStart: string;
};

const grammar: Grammar = {
  Lexer: lexer,
  ParserRules: [
    {"name": "DescriptionsDefinition$ebnf$1", "symbols": []},
    {"name": "DescriptionsDefinition$ebnf$1", "symbols": ["DescriptionsDefinition$ebnf$1", "DescriptionDefinition"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "DescriptionsDefinition", "symbols": ["ws", "DescriptionsDefinition$ebnf$1"], "postprocess": ([, descriptions]) => descriptions.reduce((prev: any, [identifier, description]: [string, any]) => { prev[identifier] = description; return prev }, {})},
    {"name": "DescriptionDefinition$ebnf$1$subexpression$1", "symbols": [(lexer.has("openBracket") ? {type: "openBracket"} : openBracket), "ws", "InitialVariables", (lexer.has("closedBracket") ? {type: "closedBracket"} : closedBracket), "ws"]},
    {"name": "DescriptionDefinition$ebnf$1", "symbols": ["DescriptionDefinition$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "DescriptionDefinition$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "DescriptionDefinition", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier), "ws", "DescriptionDefinition$ebnf$1", (lexer.has("openCurlyBracket") ? {type: "openCurlyBracket"} : openCurlyBracket), "ws", "NounDefinitions", (lexer.has("closedCurlyBracket") ? {type: "closedCurlyBracket"} : closedCurlyBracket), "ws"], "postprocess": ([{ value: identifier },,initialVariables,,,nouns]) => [identifier, { initialVariables: initialVariables?.[2] ?? {}, nouns, rootNounIdentifier: Object.keys(nouns)[0] }]},
    {"name": "InitialVariables$ebnf$1", "symbols": []},
    {"name": "InitialVariables$ebnf$1$subexpression$1", "symbols": ["InitialVariable", (lexer.has("comma") ? {type: "comma"} : comma), "ws"]},
    {"name": "InitialVariables$ebnf$1", "symbols": ["InitialVariables$ebnf$1", "InitialVariables$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "InitialVariables", "symbols": ["InitialVariables$ebnf$1", "InitialVariable"], "postprocess": ([initialVariables, initialVariable]) => [...initialVariables.map(([v]: [any]) => v), initialVariable].reduce((prev: any, [identifier, value]: [string, any]) => { prev[identifier] = value; return prev }, {})},
    {"name": "InitialVariable", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier), "ws", (lexer.has("colon") ? {type: "colon"} : colon), "ws", "Constant", "ws"], "postprocess": ([{ value:identifier },,,,value]) => [identifier, value]},
    {"name": "NounDefinitions$ebnf$1", "symbols": []},
    {"name": "NounDefinitions$ebnf$1$subexpression$1", "symbols": ["NounDefinition", (lexer.has("ws") ? {type: "ws"} : ws)]},
    {"name": "NounDefinitions$ebnf$1", "symbols": ["NounDefinitions$ebnf$1", "NounDefinitions$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "NounDefinitions", "symbols": ["NounDefinitions$ebnf$1", "NounDefinition", "ws"], "postprocess": ([nounsWithWhitespace, noun]) => [...nounsWithWhitespace.map(([noun]: [string, any]) => noun), noun].reduce((prev: any, [identifier, transformation]: [string, any]) => { prev[identifier] = { transformation }; return prev }, {})},
    {"name": "NounDefinition", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier), "ws", (lexer.has("longArrow") ? {type: "longArrow"} : longArrow), "ws", "Transformation"], "postprocess": ([{ value: identifier },,,,transformation]) => [identifier, transformation]},
    {"name": "Transformation", "symbols": ["ParallelTransformations"], "postprocess": ([transformation]) => transformation},
    {"name": "ParallelTransformations$ebnf$1", "symbols": ["ParallelTransformation"]},
    {"name": "ParallelTransformations$ebnf$1", "symbols": ["ParallelTransformations$ebnf$1", "ParallelTransformation"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "ParallelTransformations", "symbols": ["ParallelTransformations$ebnf$1", "SequentialTransformations"], "postprocess": ([transformations, transformation]) => ({ type: "parallel", children: [...transformations, transformation] })},
    {"name": "ParallelTransformations", "symbols": ["SequentialTransformations"], "postprocess": ([transformation]) => transformation},
    {"name": "ParallelTransformation", "symbols": ["SequentialTransformations", "ws", (lexer.has("parallel") ? {type: "parallel"} : parallel), "ws"], "postprocess": ([transformation]) => transformation},
    {"name": "SequentialTransformations$ebnf$1", "symbols": ["SequentialTransformation"]},
    {"name": "SequentialTransformations$ebnf$1", "symbols": ["SequentialTransformations$ebnf$1", "SequentialTransformation"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "SequentialTransformations", "symbols": ["SequentialTransformations$ebnf$1", "OrOperation"], "postprocess": ([transformations, transformation]) => ({ type: "sequential", children: [...transformations, transformation] })},
    {"name": "SequentialTransformations", "symbols": ["OrOperation"], "postprocess": ([transformation]) => transformation},
    {"name": "SequentialTransformation", "symbols": ["OrOperation", "ws", (lexer.has("arrow") ? {type: "arrow"} : arrow), "ws"], "postprocess": ([transformation]) => transformation},
    {"name": "OrOperation", "symbols": ["OrOperation", "ws", (lexer.has("or") ? {type: "or"} : or), "ws", "AndOperation"], "postprocess": ([transformation1,,,,transformation2]) => ({ type: "||", children: [transformation1, transformation2] })},
    {"name": "OrOperation", "symbols": ["AndOperation"], "postprocess": ([transformation]) => transformation},
    {"name": "AndOperation", "symbols": ["AndOperation", "ws", (lexer.has("and") ? {type: "and"} : and), "ws", "NegateOperation"], "postprocess": ([transformation1,,,,transformation2]) => ({ type: "&&", children: [transformation1, transformation2] })},
    {"name": "AndOperation", "symbols": ["NegateOperation"], "postprocess": ([transformation]) => transformation},
    {"name": "NegateOperation", "symbols": [(lexer.has("not") ? {type: "not"} : not), "ws", "NegateOperation"], "postprocess": ([,,transformation]) => ({ type: "!", children: [transformation] })},
    {"name": "NegateOperation", "symbols": ["ComparisonOperation"], "postprocess": ([transformation]) => transformation},
    {"name": "ComparisonOperation", "symbols": ["EquityOperation"], "postprocess": ([transformation]) => transformation},
    {"name": "EquityOperation", "symbols": ["EqualOperation"], "postprocess": ([transformation]) => transformation},
    {"name": "EquityOperation", "symbols": ["UnequalOperation"], "postprocess": ([transformation]) => transformation},
    {"name": "EquityOperation", "symbols": ["RelationalOperation"], "postprocess": ([transformation]) => transformation},
    {"name": "EqualOperation", "symbols": ["EquityOperation", "ws", (lexer.has("doubleEqual") ? {type: "doubleEqual"} : doubleEqual), "ws", "RelationalOperation"], "postprocess": ([transformation1,,,,transformation2]) => ({ type: "==", children: [transformation1, transformation2] })},
    {"name": "UnequalOperation", "symbols": ["EquityOperation", "ws", (lexer.has("unequal") ? {type: "unequal"} : unequal), "ws", "RelationalOperation"], "postprocess": ([transformation1,,,,transformation2]) => ({ type: "!=", children: [transformation1, transformation2] })},
    {"name": "RelationalOperation", "symbols": ["SmallerOperation"], "postprocess": ([transformation]) => transformation},
    {"name": "RelationalOperation", "symbols": ["SmallerEqualOperation"], "postprocess": ([transformation]) => transformation},
    {"name": "RelationalOperation", "symbols": ["GreaterOperation"], "postprocess": ([transformation]) => transformation},
    {"name": "RelationalOperation", "symbols": ["GreaterEqualOperation"], "postprocess": ([transformation]) => transformation},
    {"name": "RelationalOperation", "symbols": ["ArithmeticOperation"], "postprocess": ([transformation]) => transformation},
    {"name": "SmallerOperation", "symbols": ["RelationalOperation", "ws", (lexer.has("smaller") ? {type: "smaller"} : smaller), "ws", "ArithmeticOperation"], "postprocess": ([transformation1,,,,transformation2]) => ({ type: "<", children: [transformation1, transformation2] })},
    {"name": "SmallerEqualOperation", "symbols": ["RelationalOperation", "ws", (lexer.has("smallerEqual") ? {type: "smallerEqual"} : smallerEqual), "ws", "ArithmeticOperation"], "postprocess": ([transformation1,,,,transformation2]) => ({ type: "<=", children: [transformation1, transformation2] })},
    {"name": "GreaterOperation", "symbols": ["RelationalOperation", "ws", (lexer.has("greater") ? {type: "greater"} : greater), "ws", "ArithmeticOperation"], "postprocess": ([transformation1,,,,transformation2]) => ({ type: ">", children: [transformation1, transformation2] })},
    {"name": "GreaterEqualOperation", "symbols": ["RelationalOperation", "ws", (lexer.has("greaterEqual") ? {type: "greaterEqual"} : greaterEqual), "ws", "ArithmeticOperation"], "postprocess": ([transformation1,,,,transformation2]) => ({ type: ">=", children: [transformation1, transformation2] })},
    {"name": "ArithmeticOperation", "symbols": ["LineOperation"], "postprocess": ([transformation]) => transformation},
    {"name": "LineOperation", "symbols": ["AddOperation"], "postprocess": ([transformation]) => transformation},
    {"name": "LineOperation", "symbols": ["SubtractOperation"], "postprocess": ([transformation]) => transformation},
    {"name": "LineOperation", "symbols": ["PointOperation"], "postprocess": ([transformation]) => transformation},
    {"name": "AddOperation", "symbols": ["LineOperation", "ws", (lexer.has("plus") ? {type: "plus"} : plus), "ws", "PointOperation"], "postprocess": ([transformation1,,,,transformation2]) => ({ type: "+", children: [transformation1, transformation2] })},
    {"name": "SubtractOperation", "symbols": ["LineOperation", "ws", (lexer.has("minus") ? {type: "minus"} : minus), "ws", "PointOperation"], "postprocess": ([transformation1,,,,transformation2]) => ({ type: "-", children: [transformation1, transformation2] })},
    {"name": "PointOperation", "symbols": ["MultiplyOperation"], "postprocess": ([transformation]) => transformation},
    {"name": "PointOperation", "symbols": ["DivideOperation"], "postprocess": ([transformation]) => transformation},
    {"name": "PointOperation", "symbols": ["ModuloOperation"], "postprocess": ([transformation]) => transformation},
    {"name": "PointOperation", "symbols": ["InvertOperation"], "postprocess": ([transformation]) => transformation},
    {"name": "DivideOperation", "symbols": ["PointOperation", "ws", (lexer.has("divide") ? {type: "divide"} : divide), "ws", "InvertOperation"], "postprocess": ([transformation1,,,,transformation2]) => ({ type: "/", children: [transformation1, transformation2] })},
    {"name": "MultiplyOperation", "symbols": ["PointOperation", "ws", (lexer.has("multiply") ? {type: "multiply"} : multiply), "ws", "InvertOperation"], "postprocess": ([transformation1,,,,transformation2]) => ({ type: "*", children: [transformation1, transformation2] })},
    {"name": "ModuloOperation", "symbols": ["PointOperation", "ws", (lexer.has("percent") ? {type: "percent"} : percent), "ws", "InvertOperation"], "postprocess": ([transformation1,,,,transformation2]) => ({ type: "%", children: [transformation1, transformation2] })},
    {"name": "InvertOperation", "symbols": [(lexer.has("minus") ? {type: "minus"} : minus), "ws", "InvertOperation"], "postprocess": ([,,transformation]) => ({ type: "-()", children: [transformation] })},
    {"name": "InvertOperation", "symbols": ["BaseTransformation"], "postprocess": ([transformation]) => transformation},
    {"name": "BaseTransformation", "symbols": ["Operation"], "postprocess": ([transformation]) => transformation},
    {"name": "BaseTransformation", "symbols": ["NounReference"], "postprocess": ([transformation]) => transformation},
    {"name": "BaseTransformation", "symbols": [(lexer.has("thisSymbol") ? {type: "thisSymbol"} : thisSymbol)], "postprocess": () => ({ type: "this" })},
    {"name": "BaseTransformation", "symbols": ["GetVariable"], "postprocess": ([transformation]) => transformation},
    {"name": "BaseTransformation", "symbols": ["SetVariable"], "postprocess": ([transformation]) => transformation},
    {"name": "BaseTransformation", "symbols": ["Constant"], "postprocess": ([value]) => ({ type: "raw", value })},
    {"name": "BaseTransformation", "symbols": ["Conditional"], "postprocess": ([transformation]) => transformation},
    {"name": "BaseTransformation", "symbols": [(lexer.has("returnSymbol") ? {type: "returnSymbol"} : returnSymbol)], "postprocess": () => ({ type: "return" })},
    {"name": "BaseTransformation", "symbols": [(lexer.has("nullSymbol") ? {type: "nullSymbol"} : nullSymbol)], "postprocess": () => ({ type: "null" })},
    {"name": "BaseTransformation", "symbols": [(lexer.has("openBracket") ? {type: "openBracket"} : openBracket), "ws", "Transformation", "ws", (lexer.has("closedBracket") ? {type: "closedBracket"} : closedBracket)], "postprocess": ([,,transformation]) => transformation},
    {"name": "BaseTransformation", "symbols": ["Random"], "postprocess": ([transformation]) => transformation},
    {"name": "Random$ebnf$1", "symbols": []},
    {"name": "Random$ebnf$1", "symbols": ["Random$ebnf$1", "RandomStep"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Random", "symbols": [(lexer.has("openCurlyBracket") ? {type: "openCurlyBracket"} : openCurlyBracket), "Random$ebnf$1", "ws", (lexer.has("closedCurlyBracket") ? {type: "closedCurlyBracket"} : closedCurlyBracket)], "postprocess": ([,cases]) => ({ type: "stochasticSwitch", probabilities: cases.map(({ probability }: any) => probability), children: cases.map(({ transformation }: any) => transformation) })},
    {"name": "RandomStep", "symbols": ["ws", (lexer.has("number") ? {type: "number"} : number), (lexer.has("percent") ? {type: "percent"} : percent), "ws", (lexer.has("colon") ? {type: "colon"} : colon), "ws", "Transformation"], "postprocess": ([,{ value },,,,, transformation]) => ({ probability: Number.parseFloat(value) / 100, transformation })},
    {"name": "Operation", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier), (lexer.has("openBracket") ? {type: "openBracket"} : openBracket), "EmptyParameters", "ws", (lexer.has("closedBracket") ? {type: "closedBracket"} : closedBracket)], "postprocess": ([{ value },,transformations]) => ({ type: "operation", children: transformations, identifier: value })},
    {"name": "EmptyParameters", "symbols": ["ws", "Parameters"], "postprocess": ([,transformations]) => transformations},
    {"name": "EmptyParameters", "symbols": [], "postprocess": () => []},
    {"name": "Parameters$ebnf$1", "symbols": []},
    {"name": "Parameters$ebnf$1", "symbols": ["Parameters$ebnf$1", "Parameter"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Parameters", "symbols": ["Parameters$ebnf$1", "Transformation"], "postprocess": ([transformations, transformation]) => [...transformations, transformation]},
    {"name": "Parameter", "symbols": ["Transformation", "ws", (lexer.has("comma") ? {type: "comma"} : comma), "ws"], "postprocess": ([transformation]) =>  transformation},
    {"name": "NounReference", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier), (lexer.has("point") ? {type: "point"} : point), (lexer.has("identifier") ? {type: "identifier"} : identifier)], "postprocess": ([{ value: descriptionIdentifier },,{ value: nounIdentifier }]) => ({ type: "nounReference", descriptionIdentifier, nounIdentifier })},
    {"name": "NounReference", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier)], "postprocess": ([{ value }]) => ({ type: "nounReference", nounIdentifier: value })},
    {"name": "ws", "symbols": [(lexer.has("ws") ? {type: "ws"} : ws)]},
    {"name": "ws", "symbols": []},
    {"name": "Constant", "symbols": [(lexer.has("boolean") ? {type: "boolean"} : boolean)], "postprocess": ([{ value }]) => value === "true"},
    {"name": "Constant", "symbols": [(lexer.has("string") ? {type: "string"} : string)], "postprocess": ([{ value }]) => value.slice(1, -1)},
    {"name": "Constant", "symbols": [(lexer.has("number") ? {type: "number"} : number)], "postprocess": ([{ value }]) => Number.parseFloat(value)},
    {"name": "Constant", "symbols": [(lexer.has("int") ? {type: "int"} : int)], "postprocess": ([{ value }]) => Number.parseInt(value)},
    {"name": "GetVariable", "symbols": [(lexer.has("thisSymbol") ? {type: "thisSymbol"} : thisSymbol), (lexer.has("point") ? {type: "point"} : point), (lexer.has("identifier") ? {type: "identifier"} : identifier)], "postprocess": ([,,{ value: identifier }]) => ({ type: "getVariable", identifier })},
    {"name": "SetVariable", "symbols": [(lexer.has("thisSymbol") ? {type: "thisSymbol"} : thisSymbol), (lexer.has("point") ? {type: "point"} : point), (lexer.has("identifier") ? {type: "identifier"} : identifier), "ws", (lexer.has("equal") ? {type: "equal"} : equal), "ws", "Transformation"], "postprocess": ([,,{ value: identifier },,,,transformation]) => ({ type: "setVariable", identifier, children: [transformation] })},
    {"name": "Conditional", "symbols": ["IfThenElse"], "postprocess": ([value]) => value},
    {"name": "Conditional", "symbols": ["Switch"], "postprocess": ([value]) => value},
    {"name": "IfThenElse", "symbols": [(lexer.has("ifSymbol") ? {type: "ifSymbol"} : ifSymbol), (lexer.has("ws") ? {type: "ws"} : ws), "Transformation", (lexer.has("ws") ? {type: "ws"} : ws), "Then", "ws", "Else"], "postprocess": ([,,conditionTransformationId,,ifTransformationId,,elseTransformationId]) => ({ type: "if", children: [conditionTransformationId, ifTransformationId, elseTransformationId] })},
    {"name": "Then", "symbols": [(lexer.has("thenSymbol") ? {type: "thenSymbol"} : thenSymbol), "ws", (lexer.has("openCurlyBracket") ? {type: "openCurlyBracket"} : openCurlyBracket), "ws", "Transformation", "ws", (lexer.has("closedCurlyBracket") ? {type: "closedCurlyBracket"} : closedCurlyBracket)], "postprocess": ([,,,,transformations]) => transformations},
    {"name": "Else", "symbols": [(lexer.has("elseSymbol") ? {type: "elseSymbol"} : elseSymbol), "ws", (lexer.has("openCurlyBracket") ? {type: "openCurlyBracket"} : openCurlyBracket), "ws", "Transformation", "ws", (lexer.has("closedCurlyBracket") ? {type: "closedCurlyBracket"} : closedCurlyBracket)], "postprocess": ([,,,,transformations]) => transformations},
    {"name": "Switch$ebnf$1", "symbols": []},
    {"name": "Switch$ebnf$1", "symbols": ["Switch$ebnf$1", "SwitchCases"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Switch", "symbols": [(lexer.has("switchSymbol") ? {type: "switchSymbol"} : switchSymbol), (lexer.has("ws") ? {type: "ws"} : ws), "Transformation", "ws", (lexer.has("openCurlyBracket") ? {type: "openCurlyBracket"} : openCurlyBracket), "Switch$ebnf$1", "ws", (lexer.has("closedCurlyBracket") ? {type: "closedCurlyBracket"} : closedCurlyBracket)], "postprocess": ([,,transformation,,,cases]) => ({ type: "switch", cases: cases.map(({ caseValues }: any) => caseValues), children: [transformation, ...cases.map(({ transformation }: any) => transformation)] })},
    {"name": "SwitchCases$ebnf$1", "symbols": ["SwitchCase"]},
    {"name": "SwitchCases$ebnf$1", "symbols": ["SwitchCases$ebnf$1", "SwitchCase"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "SwitchCases", "symbols": ["ws", "SwitchCases$ebnf$1", "Transformation"], "postprocess": ([,caseValues,transformation]) => ({ caseValues, transformation })},
    {"name": "SwitchCase", "symbols": [(lexer.has("caseSymbol") ? {type: "caseSymbol"} : caseSymbol), (lexer.has("ws") ? {type: "ws"} : ws), "Constant", (lexer.has("colon") ? {type: "colon"} : colon), "ws"], "postprocess": ([,,caseValue]) => caseValue}
  ],
  ParserStart: "DescriptionsDefinition",
};

export default grammar;
