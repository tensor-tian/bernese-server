/** @type {import('ts-jest').JestConfigWithTsJest} */

import { loadSync } from "tsconfig";
import { pathsToModuleNameMapper } from "ts-jest";

const { compilerOptions } = loadSync(__dirname).config;
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  // this enables us to use tsconfig-paths with jest
  modulePaths: [compilerOptions.baseUrl],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths),
};
