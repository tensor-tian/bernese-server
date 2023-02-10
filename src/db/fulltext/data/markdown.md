## h2

- golang
  ```golang
  package main

  import (
    "go/scanner"
    "go/token"
    "io/ioutil"
    "log"
    "os"
    "strings"
  )

  func main() {
    code, err := ioutil.ReadAll(os.Stdin)
    if err != nil {
      log.Fatal(err)
    }
    os.Stdout.Write([]byte(segmetation(code)))
  }

  func segmetation(code []byte) string {
    var s scanner.Scanner
    fset := token.NewFileSet()
    file := fset.AddFile("", fset.Base(), len(code))
    s.Init(file, code, nil, scanner.ScanComments)

    var sb strings.Builder
    var lastRune = byte('_')
    for {
      _, tok, lit := s.Scan()
      if tok == token.EOF {
        break
      }
      word := tok.String()
      if tok.IsLiteral() || tok == token.SEMICOLON {
        word = lit
      }
      if tok == token.COMMENT {
        word = lit + "\n"
      }
      if lastRune == ' ' && len(word) > 0 && word[0] == ' ' {
        sb.WriteString(word[1:])
        if len(word) > 1 {
          lastRune = word[len(word)-1]
        }
      } else if lastRune == ' ' || len(word) > 0 && word[0] == ' ' {
        if len(word) > 0 {
          sb.WriteString(word)
          lastRune = word[len(word)-1]
        }
      } else {
        sb.WriteByte(' ')
        if len(word) > 0 {
          sb.WriteString(word)
          lastRune = word[len(word)-1]
        }
      }
    }
    return sb.String()
  }
  ```

- java

  `java` language 

  ```java
  package com.baeldung.actuator;

  import org.springframework.boot.actuate.endpoint.Endpoint;
  import org.springframework.stereotype.Component;

  import java.util.ArrayList;
  import java.util.List;

  @Component
  public class CustomEndpoint implements Endpoint<List<String>> {

      @Override
      public String getId() {
          return "customEndpoint";
      }

      @Override
      public boolean isEnabled() {
          return true;
      }

      @Override
      public boolean isSensitive() {
          return true;
      }

      @Override
      public List<String> invoke() {
          // Custom logic to build the output
          List<String> messages = new ArrayList<>();
          messages.add("This is message 1");
          messages.add("This is message 2");
          return messages;
      }
  }
  ```

  - ts

    typescript language
  ```ts
  import ts from "typescript";

  const dummyFilePath = "/file.ts";

  export default function segmentationJSCode(code: string) {
    const textAst = ts.createSourceFile(
      dummyFilePath,
      code,
      ts.ScriptTarget.Latest
    );
    const options: ts.CompilerOptions = {};
    const host: ts.CompilerHost = {
      fileExists: (filePath) => filePath === dummyFilePath,
      directoryExists: (dirPath) => dirPath === "/",
      getCurrentDirectory: () => "/",
      getDirectories: () => [],
      getCanonicalFileName: (fileName) => fileName,
      getNewLine: () => "\n",
      getDefaultLibFileName: () => "",
      getSourceFile: (filePath) =>
        filePath === dummyFilePath ? textAst : undefined,
      readFile: (filePath) => (filePath === dummyFilePath ? code : undefined),
      useCaseSensitiveFileNames: () => true,
      writeFile: () => {},
    };
    const program = ts.createProgram({
      options,
      rootNames: [dummyFilePath],
      host,
    });
    const sourceFile = program.getSourceFile(dummyFilePath);
    const scanner = ts.createScanner(
      ts.ScriptTarget.ES2020,
      false,
      ts.LanguageVariant.JSX,
      sourceFile?.text
    );
    const words: string[] = [];
    while (scanner.scan() !== ts.SyntaxKind.EndOfFileToken) {
      const tok = scanner.getTokenText();
      if (words.length > 0 && words[words.length - 1]?.endsWith(" ")) {
        if (!tok.startsWith(" ")) {
          words.push(tok);
        }
      } else {
        if (tok.startsWith(" ")) {
          words.push(tok);
        } else {
          words.push(" ", tok);
        }
      }
    }
    return words.join("");
  }
  ```

## end