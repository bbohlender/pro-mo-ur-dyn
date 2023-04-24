@preprocessor typescript
@{%
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
%}
@lexer lexer

DescriptionsDefinition  ->  ws DescriptionDefinition:*                                      {% ([, descriptions]) => descriptions.reduce((prev: any, [identifier, description]: [string, any]) => { prev[identifier] = description; return prev }, {}) %}

DescriptionDefinition   ->  %identifier ws (%openBracket ws InitialVariables %closedBracket ws):? %openCurlyBracket ws NounDefinitions %closedCurlyBracket ws {% ([{ value: identifier },,initialVariables,,,nouns]) => [identifier, { initialVariables: initialVariables?.[2] ?? {}, nouns, rootNounIdentifier: Object.keys(nouns)[0] }] %}

InitialVariables        ->  InitialVariable:*                                               {% ([initialVariables]) => initialVariables.reduce((prev: any, [identifier, value]: [string, any]) => { prev[identifier] = value; return prev }, {}) %}
InitialVariable         ->  %identifier ws %colon ws Constant ws                            {% ([{ value:identifier },,,,value]) => [identifier, value] %}

NounDefinitions         ->  (NounDefinition %ws):* NounDefinition ws                        {% ([nounsWithWhitespace, noun]) => [...nounsWithWhitespace.map(([noun]: [string, any]) => noun), noun].reduce((prev: any, [identifier, transformation]: [string, any]) => { prev[identifier] = { transformation }; return prev }, {}) %}
NounDefinition          ->  %identifier ws %longArrow ws Transformation                     {% ([{ value: identifier },,,,transformation]) => [identifier, transformation] %}

Transformation          ->  ParallelTransformations                                         {% ([transformation]) => transformation %}

ParallelTransformations ->  ParallelTransformation:+ SequentialTransformations              {% ([transformations, transformation]) => ({ type: "parallel", children: [...transformations, transformation] }) %}
                        |   SequentialTransformations                                       {% ([transformation]) => transformation %}
ParallelTransformation  ->  SequentialTransformations ws %parallel ws                       {% ([transformation]) => transformation %}

SequentialTransformations   ->  SequentialTransformation:+ OrOperation                      {% ([transformations, transformation]) => ({ type: "sequential", children: [...transformations, transformation] }) %}
                            |   OrOperation                                                 {% ([transformation]) => transformation %}
SequentialTransformation    ->  OrOperation ws %arrow ws                                    {% ([transformation]) => transformation %}

OrOperation             ->  OrOperation ws %or ws AndOperation                              {% ([transformation1,,,,transformation2]) => ({ type: "||", children: [transformation1, transformation2] }) %}
                        |   AndOperation                                                    {% ([transformation]) => transformation %}
AndOperation            ->  AndOperation ws %and ws NegateOperation                         {% ([transformation1,,,,transformation2]) => ({ type: "&&", children: [transformation1, transformation2] }) %}
                        |   NegateOperation                                                 {% ([transformation]) => transformation %}
NegateOperation         ->  %not ws NegateOperation                                         {% ([,,transformation]) => ({ type: "!", children: [transformation] }) %}
                        |   ComparisonOperation                                             {% ([transformation]) => transformation %}

ComparisonOperation     ->  EquityOperation                                                 {% ([transformation]) => transformation %}

EquityOperation         ->  EqualOperation                                                  {% ([transformation]) => transformation %}
                        |   UnequalOperation                                                {% ([transformation]) => transformation %}
                        |   RelationalOperation                                             {% ([transformation]) => transformation %}

EqualOperation          ->  EquityOperation ws %doubleEqual ws RelationalOperation          {% ([transformation1,,,,transformation2]) => ({ type: "==", children: [transformation1, transformation2] }) %}
UnequalOperation        ->  EquityOperation ws %unequal ws RelationalOperation              {% ([transformation1,,,,transformation2]) => ({ type: "!=", children: [transformation1, transformation2] }) %}

RelationalOperation     ->  SmallerOperation                                                {% ([transformation]) => transformation %}
                        |   SmallerEqualOperation                                           {% ([transformation]) => transformation %}
                        |   GreaterOperation                                                {% ([transformation]) => transformation %}
                        |   GreaterEqualOperation                                           {% ([transformation]) => transformation %}
                        |   ArithmeticOperation                                             {% ([transformation]) => transformation %}

SmallerOperation        ->  RelationalOperation ws %smaller ws ArithmeticOperation          {% ([transformation1,,,,transformation2]) => ({ type: "<", children: [transformation1, transformation2] }) %}
SmallerEqualOperation   ->  RelationalOperation ws %smallerEqual ws ArithmeticOperation     {% ([transformation1,,,,transformation2]) => ({ type: "<=", children: [transformation1, transformation2] }) %}
GreaterOperation        ->  RelationalOperation ws %greater ws ArithmeticOperation          {% ([transformation1,,,,transformation2]) => ({ type: ">", children: [transformation1, transformation2] }) %}
GreaterEqualOperation   ->  RelationalOperation ws %greaterEqual ws ArithmeticOperation     {% ([transformation1,,,,transformation2]) => ({ type: ">=", children: [transformation1, transformation2] }) %}

ArithmeticOperation     ->  LineOperation                                                   {% ([transformation]) => transformation %}

LineOperation           ->  AddOperation                                                    {% ([transformation]) => transformation %}
                        |   SubtractOperation                                               {% ([transformation]) => transformation %}
                        |   PointOperation                                                  {% ([transformation]) => transformation %}

AddOperation            ->  LineOperation ws %plus ws PointOperation                        {% ([transformation1,,,,transformation2]) => ({ type: "+", children: [transformation1, transformation2] }) %}
SubtractOperation       ->  LineOperation ws %minus ws PointOperation                       {% ([transformation1,,,,transformation2]) => ({ type: "-", children: [transformation1, transformation2] }) %}

PointOperation          ->  MultiplyOperation                                               {% ([transformation]) => transformation %}
                        |   DivideOperation                                                 {% ([transformation]) => transformation %}
                        |   ModuloOperation                                                 {% ([transformation]) => transformation %}
                        |   InvertOperation                                                 {% ([transformation]) => transformation %}

DivideOperation         ->  PointOperation ws %divide ws InvertOperation                    {% ([transformation1,,,,transformation2]) => ({ type: "/", children: [transformation1, transformation2] }) %}
MultiplyOperation       ->  PointOperation ws %multiply ws InvertOperation                  {% ([transformation1,,,,transformation2]) => ({ type: "*", children: [transformation1, transformation2] }) %}
ModuloOperation         ->  PointOperation ws %percent ws InvertOperation                   {% ([transformation1,,,,transformation2]) => ({ type: "%", children: [transformation1, transformation2] }) %}

InvertOperation         ->  %minus ws InvertOperation                                       {% ([,,transformation]) => ({ type: "-()", children: [transformation] }) %}
                        |   BaseTransformation                                              {% ([transformation]) => transformation %}

BaseTransformation      ->  Operation                                                       {% ([transformation]) => transformation %}
                        |   NounReference                                                   {% ([transformation]) => transformation %}
                        |   %thisSymbol                                                     {% () => ({ type: "this" }) %}
                        |   GetVariable                                                     {% ([transformation]) => transformation %}
                        |   SetVariable                                                     {% ([transformation]) => transformation %}
                        |   Constant                                                        {% ([value]) => ({ type: "raw", value }) %}
                        |   Conditional                                                     {% ([transformation]) => transformation %}
                        |   %returnSymbol                                                   {% () => ({ type: "return" }) %}
                        |   %nullSymbol                                                     {% () => ({ type: "null" }) %}
                        |   %openBracket ws Transformation ws %closedBracket                {% ([,,transformation]) => transformation %}
                        |   Random                                                          {% ([transformation]) => transformation %}

Random                  ->  %openCurlyBracket RandomStep:* ws %closedCurlyBracket           {% ([,cases]) => ({ type: "stochasticSwitch", probabilities: cases.map(({ probability }: any) => probability), children: cases.map(({ transformation }: any) => transformation) }) %}
RandomStep              ->  ws %number %percent ws %colon ws Transformation                 {% ([,{ value },,,,, transformation]) => ({ probability: Number.parseFloat(value) / 100, transformation }) %}

Operation               ->  %identifier %openBracket EmptyParameters ws %closedBracket      {% ([{ value },,transformations]) => ({ type: "operation", children: transformations, identifier: value }) %}
EmptyParameters         ->  ws Parameters                                                   {% ([,transformations]) => transformations%}
                        |   null                                                            {% () => [] %}
Parameters              ->  Parameter:* Transformation                                      {% ([transformations, transformation]) => [...transformations, transformation] %}
Parameter               ->  Transformation ws %comma ws                                     {% ([transformation]) =>  transformation %}

NounReference           ->  %identifier                                                     {% ([{ value }]) => ({ type: "nounReference", nounIdentifier: value }) %}

ws                      ->  %ws | null

Constant                ->  %boolean                                                        {% ([{ value }]) => value === "true" %}
                        |   %string                                                         {% ([{ value }]) => value.slice(1, -1) %}
                        |   %number                                                         {% ([{ value }]) => Number.parseFloat(value) %}
                        |   %int                                                            {% ([{ value }]) => Number.parseInt(value) %}

GetVariable             ->  %thisSymbol %point %identifier                                  {% ([,,{ value: identifier }]) => ({ type: "getVariable", identifier }) %}
SetVariable             ->  %thisSymbol %point %identifier ws %equal ws Transformation      {% ([,,{ value: identifier },,,,transformation]) => ({ type: "setVariable", identifier, children: [transformation] }) %}

Conditional             ->  IfThenElse                                                      {% ([value]) => value %}                               
                        |   Switch                                                          {% ([value]) => value %}

IfThenElse              ->  %ifSymbol %ws Transformation %ws Then ws Else                                               {% ([,,conditionTransformationId,,ifTransformationId,,elseTransformationId]) => ({ type: "if", children: [conditionTransformationId, ifTransformationId, elseTransformationId] }) %}
Then                    ->  %thenSymbol ws %openCurlyBracket ws Transformation ws %closedCurlyBracket                   {% ([,,,,transformations]) => transformations %}
Else                    ->  %elseSymbol ws %openCurlyBracket ws Transformation ws %closedCurlyBracket                   {% ([,,,,transformations]) => transformations %}

Switch                  ->  %switchSymbol %ws Transformation ws %openCurlyBracket SwitchCases:* ws %closedCurlyBracket  {% ([,,transformation,,,cases]) => ({ type: "switch", cases: cases.map(({ caseValues }: any) => caseValues), children: [transformation, ...cases.map(({ transformation }: any) => transformation)] }) %}
SwitchCases             ->  ws SwitchCase:+ Transformation                                                              {% ([,caseValues,transformation]) => ({ caseValues, transformation }) %}
SwitchCase              ->  %caseSymbol %ws Constant %colon ws                                                          {% ([,,caseValue]) => caseValue %}