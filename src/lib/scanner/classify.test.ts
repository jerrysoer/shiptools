import { describe, it, expect } from "vitest";
import { getBaseDomain, isThirdPartyCookie, isThirdPartyDomain } from "./classify";

describe("getBaseDomain — PSL-backed", () => {
  it("handles simple .com domains", () => {
    expect(getBaseDomain("www.example.com")).toBe("example.com");
    expect(getBaseDomain("sub.example.com")).toBe("example.com");
  });

  it("handles .co.uk (double TLD)", () => {
    expect(getBaseDomain("www.bbc.co.uk")).toBe("bbc.co.uk");
    expect(getBaseDomain("bbc.co.uk")).toBe("bbc.co.uk");
  });

  it("handles .com.au", () => {
    expect(getBaseDomain("news.abc.com.au")).toBe("abc.com.au");
  });

  it("handles .co.za", () => {
    expect(getBaseDomain("www.news24.co.za")).toBe("news24.co.za");
  });

  it("handles .co.jp", () => {
    expect(getBaseDomain("www.amazon.co.jp")).toBe("amazon.co.jp");
  });

  it("handles .org.uk", () => {
    expect(getBaseDomain("www.charity.org.uk")).toBe("charity.org.uk");
  });

  it("handles bare domain", () => {
    expect(getBaseDomain("example.com")).toBe("example.com");
  });

  it("falls back to input for IPs", () => {
    expect(getBaseDomain("192.168.1.1")).toBe("192.168.1.1");
  });

  it("falls back for localhost", () => {
    expect(getBaseDomain("localhost")).toBe("localhost");
  });
});

describe("isThirdPartyDomain — ccTLD accuracy", () => {
  it("correctly identifies same-site .co.uk subdomain as first-party", () => {
    expect(isThirdPartyDomain("cdn.bbc.co.uk", "www.bbc.co.uk")).toBe(false);
  });

  it("correctly identifies different .co.uk domain as third-party", () => {
    expect(isThirdPartyDomain("tracker.adtech.co.uk", "www.bbc.co.uk")).toBe(true);
  });

  it("correctly identifies .com.au first-party subdomain", () => {
    expect(isThirdPartyDomain("static.abc.com.au", "news.abc.com.au")).toBe(false);
  });
});

describe("isThirdPartyCookie — ccTLD accuracy", () => {
  it("does not flag own .co.uk subdomain as third-party", () => {
    expect(isThirdPartyCookie({ domain: ".bbc.co.uk" }, "www.bbc.co.uk")).toBe(false);
  });

  it("flags different .co.uk domain as third-party", () => {
    expect(isThirdPartyCookie({ domain: ".tracker.co.uk" }, "www.bbc.co.uk")).toBe(true);
  });
});
