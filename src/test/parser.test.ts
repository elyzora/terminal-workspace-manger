import test from "node:test";
import assert from "node:assert/strict";
import { ConfigParser } from "../parser";

test("parser accepts a valid terminals.json structure", () => {
  const parser = new ConfigParser();
  const config = parser.parse(
    JSON.stringify({
      version: 1,
      terminals: [
        {
          name: "Backend",
          cwd: "./backend",
          command: "npm run dev",
          show: true,
        },
      ],
    }),
  );

  assert.equal(config.terminals.length, 1);
  assert.equal(config.terminals[0].name, "Backend");
});
