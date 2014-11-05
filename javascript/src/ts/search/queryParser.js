///<reference path='./../../../node_modules/immutable/dist/Immutable.d.ts'/>
'use strict';
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
// parser for http://lucene.apache.org/core/2_9_4/queryparsersyntax.html
var Immutable = require('immutable');
var DumpVisitor = (function () {
    function DumpVisitor() {
        this.buffer = [];
    }
    DumpVisitor.prototype.visit = function (ast) {
        var _this = this;
        if (ast === null) {
            return;
        }
        else if (ast instanceof ExpressionListAST) {
            this.dumpPrefix(ast);
            var exprList = ast;
            exprList.expressions.forEach(function (expr) { return _this.visit(expr); });
            this.dumpSuffix(ast);
        }
        else if (ast instanceof ExpressionAST) {
            var expr = ast;
            this.dumpPrefix(ast);
            this.visit(expr.left);
            this.dumpToken(expr.op);
            this.visit(expr.right);
            this.dumpSuffix(ast);
        }
        else if (ast instanceof TermAST) {
            this.dumpWithPrefixAndSuffix(ast);
        }
    };
    DumpVisitor.prototype.dumpWithPrefixAndSuffix = function (ast) {
        this.dumpPrefix(ast);
        if (ast.field) {
            this.dumpToken(ast.field);
            this.buffer.push(":");
        }
        this.dumpToken(ast.term);
        this.dumpSuffix(ast);
    };
    DumpVisitor.prototype.dumpSuffix = function (ast) {
        var _this = this;
        ast.hiddenSuffixTokens().forEach(function (suffix) { return _this.dumpToken(suffix); });
    };
    DumpVisitor.prototype.dumpPrefix = function (ast) {
        var _this = this;
        ast.hiddenPrefixTokens().forEach(function (prefix) { return _this.dumpToken(prefix); });
    };
    DumpVisitor.prototype.dumpToken = function (token) {
        token !== null && this.buffer.push(token.asString());
    };
    DumpVisitor.prototype.result = function () {
        return this.buffer.join("");
    };
    return DumpVisitor;
})();
exports.DumpVisitor = DumpVisitor;
(function (TokenType) {
    TokenType[TokenType["EOF"] = 0] = "EOF";
    TokenType[TokenType["WS"] = 1] = "WS";
    TokenType[TokenType["TERM"] = 2] = "TERM";
    TokenType[TokenType["PHRASE"] = 3] = "PHRASE";
    TokenType[TokenType["AND"] = 4] = "AND";
    TokenType[TokenType["OR"] = 5] = "OR";
    TokenType[TokenType["NOT"] = 6] = "NOT";
    TokenType[TokenType["COLON"] = 7] = "COLON";
})(exports.TokenType || (exports.TokenType = {}));
var TokenType = exports.TokenType;
var BaseAST = (function () {
    function BaseAST() {
        this.hiddenPrefix = Immutable.List.of();
        this.hiddenSuffix = Immutable.List.of();
    }
    BaseAST.prototype.hiddenPrefixTokens = function () {
        return this.hiddenPrefix;
    };
    BaseAST.prototype.hiddenSuffixTokens = function () {
        return this.hiddenSuffix;
    };
    return BaseAST;
})();
var ExpressionAST = (function (_super) {
    __extends(ExpressionAST, _super);
    function ExpressionAST(left, op, right) {
        _super.call(this);
        this.left = left;
        this.op = op;
        this.right = right;
        this.left = left;
        this.right = right;
        this.op = op;
    }
    return ExpressionAST;
})(BaseAST);
exports.ExpressionAST = ExpressionAST;
var TermAST = (function (_super) {
    __extends(TermAST, _super);
    function TermAST(term, field) {
        _super.call(this);
        this.term = term;
        this.field = field;
    }
    TermAST.prototype.isPhrase = function () {
        return this.term.asString().indexOf(" ") !== -1;
    };
    return TermAST;
})(BaseAST);
exports.TermAST = TermAST;
var ExpressionListAST = (function (_super) {
    __extends(ExpressionListAST, _super);
    function ExpressionListAST() {
        var expressions = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            expressions[_i - 0] = arguments[_i];
        }
        _super.call(this);
        this.expressions = Immutable.List.of();
        this.expressions = this.expressions.merge(expressions);
    }
    ExpressionListAST.prototype.add = function (expr) {
        this.expressions = this.expressions.push(expr);
    };
    return ExpressionListAST;
})(BaseAST);
exports.ExpressionListAST = ExpressionListAST;
var Token = (function () {
    function Token(input, type, beginPos, endPos) {
        this.input = input;
        this.type = type;
        this.beginPos = beginPos;
        this.endPos = endPos;
    }
    Token.prototype.asString = function () {
        return this.input.substring(this.beginPos, this.endPos);
    };
    return Token;
})();
exports.Token = Token;
var QueryLexer = (function () {
    function QueryLexer(input) {
        this.input = input;
        this.pos = 0;
        this.eofToken = new Token(this.input, 0 /* EOF */, input.length - 1, input.length - 1);
    }
    QueryLexer.prototype.next = function () {
        var token = this.eofToken;
        var la = this.la();
        if (this.isWhitespace(la)) {
            token = this.whitespace();
        }
        else if (this.isKeyword("OR")) {
            token = this.or();
        }
        else if (this.isKeyword("AND")) {
            token = this.and();
        }
        else if (la === '"') {
            token = this.phrase();
        }
        else if (this.isDigit(la)) {
            token = this.term();
        }
        else if (la === ':') {
            var startPos = this.pos;
            this.consume();
            token = new Token(this.input, 7 /* COLON */, startPos, this.pos);
        }
        // FIME: no matching token error instead of EOF
        return token;
    };
    QueryLexer.prototype.isKeyword = function (keyword) {
        for (var i = 0; i < keyword.length; i++) {
            if (this.la(i) !== keyword[i]) {
                return false;
            }
        }
        // be sure that it is not a prefix of something else
        return this.isWhitespace(this.la(i)) || this.la(i) === null;
    };
    QueryLexer.prototype.or = function () {
        var startPos = this.pos;
        this.consume(2);
        return new Token(this.input, 5 /* OR */, startPos, this.pos);
    };
    QueryLexer.prototype.and = function () {
        var startPos = this.pos;
        this.consume(3);
        return new Token(this.input, 4 /* AND */, startPos, this.pos);
    };
    QueryLexer.prototype.whitespace = function () {
        var startPos = this.pos;
        var la = this.la();
        while (la !== null && this.isWhitespace(la)) {
            this.consume();
            la = this.la();
        }
        return new Token(this.input, 1 /* WS */, startPos, this.pos);
    };
    QueryLexer.prototype.term = function () {
        var startPos = this.pos;
        var la = this.la();
        while (la !== null && this.isDigit(la)) {
            this.consume();
            la = this.la();
        }
        return new Token(this.input, 2 /* TERM */, startPos, this.pos);
    };
    QueryLexer.prototype.phrase = function () {
        var startPos = this.pos;
        this.consume(); // skip starting "
        var la = this.la();
        while (la !== null && la !== '"') {
            this.consume();
            la = this.la();
        }
        this.consume(); // skip ending "
        return new Token(this.input, 3 /* PHRASE */, startPos, this.pos);
    };
    // TODO: handle escaping using state pattern
    QueryLexer.prototype.isDigit = function (char) {
        return char !== null && (('a' <= char && char <= 'z') || ('A' <= char && char <= 'Z') || ('0' <= char && char <= '9'));
    };
    QueryLexer.prototype.isWhitespace = function (char) {
        return '\n\r \t'.indexOf(char) !== -1;
    };
    QueryLexer.prototype.consume = function (n) {
        if (n === void 0) { n = 1; }
        this.pos += n;
    };
    QueryLexer.prototype.la = function (la) {
        if (la === void 0) { la = 0; }
        var index = this.pos + la;
        return (this.input.length <= index) ? null : this.input[index];
    };
    return QueryLexer;
})();
/**
 * Parser for http://lucene.apache.org/core/2_9_4/queryparsersyntax.html
 */
var QueryParser = (function () {
    function QueryParser(input) {
        this.input = input;
        this.errors = Immutable.List.of();
        this.lexer = new QueryLexer(input);
        this.tokenBuffer = [];
    }
    QueryParser.prototype.consume = function () {
        this.tokenBuffer.splice(0, 1);
    };
    QueryParser.prototype.la = function (la) {
        if (la === void 0) { la = 0; }
        while (la >= this.tokenBuffer.length) {
            var token = this.lexer.next();
            if (token.type === 0 /* EOF */) {
                return token;
            }
            this.tokenBuffer.push(token);
        }
        return this.tokenBuffer[la];
    };
    QueryParser.prototype.skipWS = function () {
        return this.syncWhile(1 /* WS */);
    };
    QueryParser.prototype.syncWhile = function () {
        var _this = this;
        var syncWhile = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            syncWhile[_i - 0] = arguments[_i];
        }
        var skippedTokens = Immutable.List.of().asMutable();
        while (syncWhile.some(function (type) { return type === _this.la().type; })) {
            skippedTokens.push(this.la());
            this.consume();
        }
        return skippedTokens.asImmutable();
    };
    QueryParser.prototype.syncTo = function (syncTo) {
        var _this = this;
        var skippedTokens = Immutable.List.of().asMutable();
        while (this.la().type !== 0 /* EOF */ && syncTo.every(function (type) { return type !== _this.la().type; })) {
            skippedTokens.push(this.la());
            this.consume();
        }
        return skippedTokens.asImmutable();
    };
    QueryParser.prototype.unexpectedToken = function () {
        var syncTo = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            syncTo[_i - 0] = arguments[_i];
        }
        this.errors = this.errors.push({
            position: this.la().beginPos,
            message: "Unexpected input"
        });
        this.syncTo(syncTo);
    };
    QueryParser.prototype.missingToken = function (tokenName) {
        var syncTo = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            syncTo[_i - 1] = arguments[_i];
        }
        this.errors = this.errors.push({
            position: this.la().beginPos,
            message: "Missing " + tokenName
        });
        this.syncTo(syncTo);
    };
    QueryParser.prototype.parse = function () {
        this.errors = this.errors.clear();
        var ast;
        var prefix = this.skipWS();
        ast = this.exprs();
        ast.hiddenPrefix = ast.hiddenPrefix.merge(prefix);
        var trailingSuffix = this.skipWS();
        ast.hiddenSuffix = ast.hiddenSuffix.merge(trailingSuffix);
        return ast;
    };
    QueryParser.prototype.exprs = function () {
        var expressionList = new ExpressionListAST();
        var expr = this.expr();
        if (!this.isExpr()) {
            return expr;
        }
        else {
            expressionList.add(expr);
            while (this.isExpr()) {
                expr = this.expr();
                expressionList.add(expr);
            }
            return expressionList;
        }
    };
    QueryParser.prototype.expr = function () {
        var left = null;
        var op = null;
        var right = null;
        // left
        var la = this.la();
        switch (la.type) {
            case 2 /* TERM */:
            case 3 /* PHRASE */:
                left = this.termOrPhrase();
                break;
            default:
                this.unexpectedToken(0 /* EOF */);
                break;
        }
        left.hiddenSuffix = this.skipWS();
        if (!this.isOperator()) {
            return left;
        }
        else {
            op = this.la();
            this.consume();
            var prefix = this.skipWS();
            if (this.isExpr()) {
                right = this.expr();
                right.hiddenPrefix = prefix;
            }
            else {
                this.missingToken("right side of expression", 0 /* EOF */);
            }
            return new ExpressionAST(left, op, right);
        }
    };
    QueryParser.prototype.isFirstOf = function () {
        var _this = this;
        var tokenTypes = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            tokenTypes[_i - 0] = arguments[_i];
        }
        return tokenTypes.some(function (tokenType) { return _this.la().type === tokenType; });
    };
    QueryParser.prototype.isExpr = function () {
        return this.isFirstOf(2 /* TERM */, 3 /* PHRASE */);
    };
    QueryParser.prototype.isOperator = function () {
        return this.isFirstOf(5 /* OR */, 4 /* AND */);
    };
    QueryParser.prototype.termOrPhrase = function () {
        var termOrField = this.la();
        this.consume();
        // no ws allowed here
        if (this.la().type === 7 /* COLON */) {
            this.consume();
            if (this.la().type === 2 /* TERM */ || this.la().type === 3 /* PHRASE */) {
                var term = this.la();
                this.consume();
                var ast = new TermAST(term, termOrField);
                return ast;
            }
            else {
                this.missingToken("term or phrase for field", 0 /* EOF */);
            }
        }
        var ast = new TermAST(termOrField);
        return ast;
    };
    return QueryParser;
})();
exports.QueryParser = QueryParser;
//# sourceMappingURL=queryParser.js.map