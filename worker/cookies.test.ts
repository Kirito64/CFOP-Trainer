import { describe, expect, test } from "bun:test";
import { parseCookies, serializeCookie } from "./cookies";

describe("parseCookies", () => {
  test("handles missing header", () => expect(parseCookies(null)).toEqual({}));

  test("parses multiple cookies, trimming whitespace and quotes", () => {
    expect(parseCookies('a=1; b = two ;c="quoted"')).toEqual({ a: "1", b: "two", c: "quoted" });
  });

  test("decodes values and keeps '=' inside values", () => {
    expect(parseCookies("tok=abc%3D%3D; x=a=b")).toEqual({ tok: "abc==", x: "a=b" });
  });

  test("first occurrence wins and junk is ignored", () => {
    expect(parseCookies("a=1; garbage; =nope; a=2; bad=%E0%A4%A")).toEqual({ a: "1", bad: "%E0%A4%A" });
  });
});

describe("serializeCookie", () => {
  test("defaults to HttpOnly, Lax, Path=/", () => {
    expect(serializeCookie("s", "v")).toBe("s=v; Path=/; HttpOnly; SameSite=Lax");
  });

  test("adds Secure and Max-Age", () => {
    expect(serializeCookie("s", "a b", { secure: true, maxAge: 60, path: "/api", sameSite: "Strict" })).toBe(
      "s=a%20b; Path=/api; Max-Age=60; HttpOnly; Secure; SameSite=Strict",
    );
  });

  test("round-trips through parseCookies", () => {
    const value = "x+y/z==";
    const header = serializeCookie("t", value).split(";")[0];
    expect(parseCookies(header ?? "").t).toBe(value);
  });
});
